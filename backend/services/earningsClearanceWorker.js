const mongoose = require('mongoose');
const PassengerJourney = require('../models/PassengerJourney');
const TripInstance = require('../models/TripInstance');
const DisputeRecord = require('../models/DisputeRecord');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const User = require('../models/User');
const outboxService = require('./outboxService');

class EarningsClearanceWorker {
  /**
   * Clears pending driver earnings for a single PassengerJourney after 2-hour dispute window.
   * Atomically transfers funds from 2030_DRIVER_PENDING to 2040_DRIVER_AVAILABLE.
   *
   * @param {ObjectId|string} journeyId 
   * @param {Object} options - { session, forceClear }
   * @returns {Promise<{ cleared: boolean, journal?: Object, amountMad?: number }>}
   */
  async clearJourneyEarnings(journeyId, options = {}) {
    const session = options.session || await mongoose.startSession();
    const isExternalSession = !!options.session;

    if (!isExternalSession) {
      session.startTransaction();
    }

    try {
      // 1. Atomic conditional lock: fetch and mark earningsClearedAt to prevent concurrent workers from processing
      const now = new Date();
      const journey = await PassengerJourney.findOneAndUpdate(
        {
          _id: journeyId,
          status: 'COMPLETED',
          paymentType: 'DIGITAL_ESCROW',
          earningsClearedAt: null,
          driverEarningsPendingAt: { $ne: null }
        },
        { $set: { earningsClearedAt: now } },
        { new: true, session }
      );

      if (!journey) {
        // Either not found, already cleared, not completed, or not digital
        if (!isExternalSession) {
          await session.commitTransaction();
          session.endSession();
        }
        return { cleared: false, reason: 'NOT_ELIGIBLE_OR_ALREADY_CLEARED' };
      }

      // 2. Dispute check: ensure no unresolved dispute exists for this journey
      if (journey.disputeId) {
        const dispute = await DisputeRecord.findById(journey.disputeId).session(session);
        if (dispute && ['OPEN', 'UNDER_INVESTIGATION'].includes(dispute.status)) {
          // Revert lock and skip clearance
          journey.earningsClearedAt = null;
          await journey.save({ session });

          if (!isExternalSession) {
            await session.commitTransaction();
            session.endSession();
          }
          return { cleared: false, reason: 'BLOCKED_BY_UNRESOLVED_DISPUTE' };
        }
      }

      // 3. Ensure driver net amount is positive
      const driverNetAmount = journey.taxSnapshot?.driverNetAmount;
      if (!driverNetAmount || driverNetAmount <= 0) {
        if (!isExternalSession) {
          await session.commitTransaction();
          session.endSession();
        }
        return { cleared: false, reason: 'NO_PENDING_AMOUNT' };
      }

      const driverNetCentimes = Math.round(driverNetAmount * 100);

      // 4. Retrieve driver ID from TripInstance
      const trip = await TripInstance.findById(journey.tripInstanceId).session(session);
      if (!trip || !trip.driverId) {
        throw new Error(`TripInstance or driverId not found for journey ${journey._id}`);
      }

      const driverId = trip.driverId;
      const driver = await User.findById(driverId).session(session);
      if (!driver) {
        throw new Error(`Driver ${driverId} not found`);
      }

      // 5. Create Double-Entry Journal (2030 Pending -> 2040 Available)
      const journal = new FinancialJournal({
        referenceType: 'EARNINGS_CLEARANCE',
        referenceId: journey._id,
        description: `Automated 2-hour clearance of pending earnings for journey ${journey._id}`,
        totalDebitCentimes: driverNetCentimes,
        totalCreditCentimes: driverNetCentimes,
        isBalanced: true,
        metadata: {
          journeyId: journey._id,
          tripInstanceId: trip._id,
          driverId,
          driverNetAmount,
          clearedAt: now
        }
      });
      await journal.save({ session });

      // Debit Driver Pending Earnings (Liability decreases)
      const debitPending = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2030_LIABILITY_DRIVER_PENDING',
        userId: driverId,
        type: 'DEBIT',
        amountCentimes: driverNetCentimes,
        description: `Clear pending earnings for journey ${journey._id}`
      });

      // Credit Driver Available Wallet (Liability increases)
      const creditAvailable = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2040_LIABILITY_DRIVER_AVAILABLE',
        userId: driverId,
        type: 'CREDIT',
        amountCentimes: driverNetCentimes,
        description: `Make driver earnings available for withdrawal for journey ${journey._id}`
      });

      await Promise.all([
        debitPending.save({ session }),
        creditAvailable.save({ session })
      ]);

      // 6. Update Driver Materialized View Atomically
      driver.pendingEarnings = Number(Math.max(0, (driver.pendingEarnings || 0) - driverNetAmount).toFixed(2));
      driver.walletBalance = Number(((driver.walletBalance || 0) + driverNetAmount).toFixed(2));
      await driver.save({ session });

      // 7. Emit Transactional Outbox Event
      await outboxService.emit('PASSENGER_JOURNEY', journey._id, 'driver.earnings_cleared', {
        journeyId: journey._id,
        tripInstanceId: trip._id,
        driverId,
        amountMad: driverNetAmount,
        journalId: journal._id,
        clearedAt: now
      }, { session });

      if (!isExternalSession) {
        await session.commitTransaction();
        session.endSession();
      }

      return {
        cleared: true,
        journal,
        amountMad: driverNetAmount,
        driverId
      };
    } catch (err) {
      if (!isExternalSession) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  }

  /**
   * Cron/Scheduled entry point: Sweeps all journeys whose dispute window has passed.
   *
   * @param {Object} options - { windowMs, batchSize }
   * @returns {Promise<{ examinedCount: number, clearedCount: number, totalClearedMad: number }>}
   */
  async processEligibleClearances(options = {}) {
    const windowMs = options.windowMs || (2 * 60 * 60 * 1000); // 2 hours default
    const batchSize = options.batchSize || 50;
    const thresholdDate = new Date(Date.now() - windowMs);

    // Query eligible journeys based strictly on canonical driverEarningsPendingAt timestamp
    const eligibleJourneys = await PassengerJourney.find({
      status: 'COMPLETED',
      paymentType: 'DIGITAL_ESCROW',
      earningsClearedAt: null,
      driverEarningsPendingAt: { $lte: thresholdDate, $ne: null }
    }).limit(batchSize);

    let clearedCount = 0;
    let totalClearedMad = 0;

    for (const journey of eligibleJourneys) {
      try {
        const result = await this.clearJourneyEarnings(journey._id);
        if (result.cleared) {
          clearedCount += 1;
          totalClearedMad = Number((totalClearedMad + result.amountMad).toFixed(2));
        }
      } catch (err) {
        console.error(`[EarningsClearanceWorker] Failed to clear earnings for journey ${journey._id}:`, err.message);
      }
    }

    return {
      examinedCount: eligibleJourneys.length,
      clearedCount,
      totalClearedMad
    };
  }
}

module.exports = new EarningsClearanceWorker();
