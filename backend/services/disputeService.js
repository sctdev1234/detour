const mongoose = require('mongoose');
const DisputeRecord = require('../models/DisputeRecord');
const PassengerJourney = require('../models/PassengerJourney');
const TripInstance = require('../models/TripInstance');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const User = require('../models/User');
const outboxService = require('./outboxService');
const JourneyStateMachine = require('../state/JourneyStateMachine');
const tripCompletionEngine = require('./tripCompletionEngine');

class DisputeService {
  /**
   * Admin resolves a dispute with an authoritative financial ruling.
   * @param {ObjectId} disputeId 
   * @param {ObjectId} adminUserId 
   * @param {string} resolutionType - 'RESOLVED_REFUND' | 'RESOLVED_PAYOUT' | 'RESOLVED_SPLIT'
   * @param {Object} details - { decisionNotes, refundAmountMad, driverPayoutMad }
   * @param {Object} options - { session }
   */
  async resolveDispute(disputeId, adminUserId, resolutionType, details = {}, options = {}) {
    const session = options.session || await mongoose.startSession();
    const isExternalSession = !!options.session;

    if (!isExternalSession) session.startTransaction();

    try {
      const dispute = await DisputeRecord.findById(disputeId).session(session);
      if (!dispute) throw new Error('DisputeRecord not found');

      if (['RESOLVED_REFUND', 'RESOLVED_PAYOUT', 'RESOLVED_SPLIT', 'DISMISSED'].includes(dispute.status)) {
        throw new Error(`Dispute already resolved with status: ${dispute.status}`);
      }

      const journey = await PassengerJourney.findById(dispute.passengerJourneyId).session(session);
      if (!journey) throw new Error('PassengerJourney not found');

      const trip = await TripInstance.findById(dispute.tripInstanceId).session(session);
      const driverId = trip ? trip.driverId : null;

      const fareAmountMad = journey.fareAmountMad;
      const totalCentimes = Math.round(fareAmountMad * 100);

      let refundCentimes = 0;
      let driverPayoutCentimes = 0;

      if (resolutionType === 'RESOLVED_REFUND') {
        refundCentimes = totalCentimes;
        driverPayoutCentimes = 0;
      } else if (resolutionType === 'RESOLVED_PAYOUT') {
        refundCentimes = 0;
        // Payout net driver amount (e.g. 85%)
        driverPayoutCentimes = Math.round(totalCentimes * 0.85);
      } else if (resolutionType === 'RESOLVED_SPLIT') {
        refundCentimes = Math.round((details.refundAmountMad || 0) * 100);
        driverPayoutCentimes = Math.round((details.driverPayoutMad || 0) * 100);
      }

      const platformRetainedCentimes = Math.max(0, totalCentimes - refundCentimes - driverPayoutCentimes);

      // Create Double-Entry Dispute Settlement Journal
      const journal = new FinancialJournal({
        referenceType: 'DISPUTE_REFUND',
        referenceId: dispute._id,
        description: `Dispute resolution (${resolutionType}) for dispute ${dispute._id}`,
        totalDebitCentimes: totalCentimes,
        totalCreditCentimes: refundCentimes + driverPayoutCentimes + platformRetainedCentimes,
        isBalanced: true,
        metadata: { adminUserId, resolutionType, decisionNotes: details.decisionNotes }
      });
      await journal.save({ session });

      // Debit Digital Escrow Pool
      const debitEscrow = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2010_LIABILITY_ESCROW_DIGITAL',
        userId: journey.passengerId,
        type: 'DEBIT',
        amountCentimes: totalCentimes,
        description: `Release frozen dispute escrow for journey ${journey._id}`
      });
      await debitEscrow.save({ session });

      if (refundCentimes > 0) {
        const creditClient = new FinancialLedgerEntry({
          journalId: journal._id,
          accountId: '2000_LIABILITY_CLIENT_WALLET',
          userId: journey.passengerId,
          type: 'CREDIT',
          amountCentimes: refundCentimes,
          description: `Dispute resolution refund for journey ${journey._id}`
        });
        await creditClient.save({ session });
      }

      if (driverPayoutCentimes > 0 && driverId) {
        const creditDriver = new FinancialLedgerEntry({
          journalId: journal._id,
          accountId: '2040_LIABILITY_DRIVER_AVAILABLE',
          userId: driverId,
          type: 'CREDIT',
          amountCentimes: driverPayoutCentimes,
          description: `Dispute resolution payout for driver ${driverId}`
        });
        await creditDriver.save({ session });
      }

      if (platformRetainedCentimes > 0) {
        const creditPlatform = new FinancialLedgerEntry({
          journalId: journal._id,
          accountId: '4000_REVENUE_PLATFORM_COMMISSION',
          type: 'CREDIT',
          amountCentimes: platformRetainedCentimes,
          description: `Dispute fee retained by platform ${journey._id}`
        });
        await creditPlatform.save({ session });
      }

      // Update Materialized Views
      const passenger = await User.findById(journey.passengerId).session(session);
      if (passenger) {
        if (refundCentimes > 0) {
          passenger.walletBalance = Number(((passenger.walletBalance || 0) + (refundCentimes / 100)).toFixed(2));
        }
        if (passenger.heldBalance && passenger.heldBalance > 0) {
          passenger.heldBalance = Number(Math.max(0, (passenger.heldBalance || 0) - (totalCentimes / 100)).toFixed(2));
        }
        await passenger.save({ session });
      }

      if (driverId && driverPayoutCentimes > 0) {
        const driver = await User.findById(driverId).session(session);
        if (driver) {
          driver.walletBalance = Number(((driver.walletBalance || 0) + (driverPayoutCentimes / 100)).toFixed(2));
          await driver.save({ session });
        }
      }

      dispute.status = resolutionType;
      dispute.resolution = {
        resolvedBy: adminUserId,
        resolvedAt: new Date(),
        decisionNotes: details.decisionNotes || 'Admin resolution complete',
        refundAmountCentimes: refundCentimes,
        driverPayoutCentimes,
        settlementJournalId: journal._id
      };
      await dispute.save({ session });

      JourneyStateMachine.validateTransition(journey.status, JourneyStateMachine.STATES.COMPLETED);
      journey.status = JourneyStateMachine.STATES.COMPLETED;
      journey.ratingWindowExpiresAt = new Date(Date.now() + 48 * 3600 * 1000);
      await journey.save({ session });

      await outboxService.emit('DISPUTE', dispute._id, 'dispute.resolved', {
        disputeId: dispute._id,
        journeyId: journey._id,
        status: resolutionType,
        refundAmountMad: refundCentimes / 100,
        driverPayoutMad: driverPayoutCentimes / 100
      }, { session });

      // DEC-LC-002: Evaluate immediate trip completion
      if (journey.tripInstanceId) {
        await tripCompletionEngine.evaluateTripCompletion(journey.tripInstanceId, { session });
      }

      if (!isExternalSession) {
        await session.commitTransaction();
        session.endSession();
      }

      return { success: true, dispute, journal };
    } catch (err) {
      if (!isExternalSession) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  }
}

module.exports = new DisputeService();
