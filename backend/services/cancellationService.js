const mongoose = require('mongoose');
const PassengerJourney = require('../models/PassengerJourney');
const TripInstance = require('../models/TripInstance');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const User = require('../models/User');
const capacityService = require('./capacityService');
const outboxService = require('./outboxService');
const TaxService = require('./tax/TaxService');
const JourneyStateMachine = require('../state/JourneyStateMachine');
const tripCompletionEngine = require('./tripCompletionEngine');

class CancellationService {
  /**
   * Cancel an individual PassengerJourney according to canonical cancellation tiers.
   * @param {ObjectId} journeyId 
   * @param {ObjectId} cancelledByUserId 
   * @param {string} reason 
   * @param {Object} options - { session }
   */
  async cancelJourney(journeyId, cancelledByUserId, reason = 'User requested cancellation', options = {}) {
    const session = options.session || await mongoose.startSession();
    const isExternalSession = !!options.session;

    if (!isExternalSession) session.startTransaction();

    try {
      const journey = await PassengerJourney.findById(journeyId).session(session);
      if (!journey) throw new Error('PassengerJourney not found');

      if (JourneyStateMachine.isTerminal(journey.status)) {
        throw new Error(`Cannot cancel journey in terminal state: ${journey.status}`);
      }

      if (journey.status === 'BOARDED' || journey.status === 'DROPPED_OFF') {
        throw new Error('Self-service cancellation forbidden after boarding. Contact support.');
      }

      const trip = await TripInstance.findById(journey.tripInstanceId).session(session);
      if (!trip) throw new Error('TripInstance not found');

      const isClient = journey.passengerId.toString() === cancelledByUserId.toString();
      const isDriver = trip.driverId && trip.driverId.toString() === cancelledByUserId.toString();

      const departureTime = trip.scheduledTime || trip.scheduledDepartureTime || new Date();
      const hoursUntilDeparture = (new Date(departureTime) - new Date()) / (1000 * 60 * 60);

      let refundFraction = 1.0;
      let driverCompFraction = 0.0;
      let platformFeeFraction = 0.0;
      let status = isClient ? JourneyStateMachine.STATES.CANCELLED_BY_CLIENT : JourneyStateMachine.STATES.CANCELLED_BY_DRIVER;

      JourneyStateMachine.validateTransition(journey.status, status);

      if (isClient) {
        if (hoursUntilDeparture >= 24) {
          refundFraction = 1.0;
          driverCompFraction = 0.0;
          platformFeeFraction = 0.0;
        } else if (hoursUntilDeparture >= 2) {
          refundFraction = 0.90;
          platformFeeFraction = 0.10;
          driverCompFraction = 0.0;
        } else {
          // < 2 hours
          refundFraction = 0.50;
          driverCompFraction = 0.50;
          platformFeeFraction = 0.0;
        }
      } else if (isDriver) {
        // Driver cancellation -> 100% passenger refund
        refundFraction = 1.0;
        driverCompFraction = 0.0;
        platformFeeFraction = 0.0;
      }

      // 1. Release Capacity
      capacityService.releaseSeats(trip, journey.pickupWaypointIndex, journey.dropoffWaypointIndex, journey.seatsBooked);
      await trip.save({ session });

      // 2. Financial Ledger Adjustments
      const fareAmountMad = journey.fareAmountMad;
      const totalCentimes = Math.round(fareAmountMad * 100);
      const refundCentimes = Math.round(totalCentimes * refundFraction);
      const driverCompCentimes = Math.round(totalCentimes * driverCompFraction);
      const platformFeeCentimes = totalCentimes - refundCentimes - driverCompCentimes;

      const passenger = await User.findById(journey.passengerId).session(session);
      const driver = trip.driverId ? await User.findById(trip.driverId).session(session) : null;

      if (journey.paymentType === 'DIGITAL_ESCROW') {
        const journal = new FinancialJournal({
          referenceType: 'CANCELLATION_PENALTY',
          referenceId: journey._id,
          description: `Cancellation settlement for journey ${journey._id} (${status})`,
          totalDebitCentimes: totalCentimes,
          totalCreditCentimes: refundCentimes + driverCompCentimes + platformFeeCentimes,
          isBalanced: true,
          metadata: { hoursUntilDeparture, refundFraction, driverCompFraction }
        });
        await journal.save({ session });

        // Debit Digital Escrow Pool
        const debitEscrow = new FinancialLedgerEntry({
          journalId: journal._id,
          accountId: '2010_LIABILITY_ESCROW_DIGITAL',
          userId: journey.passengerId,
          type: 'DEBIT',
          amountCentimes: totalCentimes,
          description: `Release digital escrow for cancelled journey ${journey._id}`
        });
        await debitEscrow.save({ session });

        // Credit Client Wallet for refund
        if (refundCentimes > 0) {
          const creditClient = new FinancialLedgerEntry({
            journalId: journal._id,
            accountId: '2000_LIABILITY_CLIENT_WALLET',
            userId: journey.passengerId,
            type: 'CREDIT',
            amountCentimes: refundCentimes,
            description: `Refund for cancelled journey ${journey._id}`
          });
          await creditClient.save({ session });
        }

        // Credit Driver Pending for compensation
        if (driverCompCentimes > 0 && driver) {
          const creditDriver = new FinancialLedgerEntry({
            journalId: journal._id,
            accountId: '2030_LIABILITY_DRIVER_PENDING',
            userId: driver._id,
            type: 'CREDIT',
            amountCentimes: driverCompCentimes,
            description: `Driver compensation for late cancellation ${journey._id}`
          });
          await creditDriver.save({ session });
        }

        // Credit Platform Revenue for retained fee
        if (platformFeeCentimes > 0) {
          const creditPlatform = new FinancialLedgerEntry({
            journalId: journal._id,
            accountId: '4000_REVENUE_PLATFORM_COMMISSION',
            type: 'CREDIT',
            amountCentimes: platformFeeCentimes,
            description: `Platform fee on cancellation ${journey._id}`
          });
          await creditPlatform.save({ session });
        }

        // Update Materialized Balances
        if (passenger) {
          passenger.heldBalance = Number(Math.max(0, (passenger.heldBalance || 0) - fareAmountMad).toFixed(2));
          passenger.walletBalance = Number(((passenger.walletBalance || 0) + (refundCentimes / 100)).toFixed(2));
          await passenger.save({ session });
        }

        if (driver && driverCompCentimes > 0) {
          driver.pendingEarnings = Number(((driver.pendingEarnings || 0) + (driverCompCentimes / 100)).toFixed(2));
          await driver.save({ session });
        }

      } else if (journey.paymentType === 'CASH_ON_BOARDING' && driver) {
        // Cash Escrow was locked from driver wallet
        const commissionCentimes = Math.round((fareAmountMad * 0.15) * 100);

        const journal = new FinancialJournal({
          referenceType: 'CANCELLATION_PENALTY',
          referenceId: journey._id,
          description: `Release cash commission hold on cancellation ${journey._id}`,
          totalDebitCentimes: commissionCentimes,
          totalCreditCentimes: commissionCentimes,
          isBalanced: true
        });
        await journal.save({ session });

        // Release commission lock back to driver available balance
        const debitCashEscrow = new FinancialLedgerEntry({
          journalId: journal._id,
          accountId: '2020_LIABILITY_ESCROW_CASH_COMMISSION',
          userId: driver._id,
          type: 'DEBIT',
          amountCentimes: commissionCentimes,
          description: `Unlock cash commission for cancelled journey ${journey._id}`
        });

        const creditDriver = new FinancialLedgerEntry({
          journalId: journal._id,
          accountId: '2040_LIABILITY_DRIVER_AVAILABLE',
          userId: driver._id,
          type: 'CREDIT',
          amountCentimes: commissionCentimes,
          description: `Restore driver available balance on cancellation ${journey._id}`
        });

        await Promise.all([debitCashEscrow.save({ session }), creditDriver.save({ session })]);

        driver.heldBalance = Number(Math.max(0, (driver.heldBalance || 0) - (commissionCentimes / 100)).toFixed(2));
        driver.walletBalance = Number(((driver.walletBalance || 0) + (commissionCentimes / 100)).toFixed(2));
        await driver.save({ session });
      }

      journey.status = status;
      await journey.save({ session });

      await outboxService.emit('PASSENGER_JOURNEY', journey._id, 'passenger.cancelled', {
        journeyId: journey._id,
        tripInstanceId: trip._id,
        cancelledBy: cancelledByUserId,
        status,
        refundAmountMad: refundCentimes / 100,
        driverCompensationMad: driverCompCentimes / 100
      }, { session });

      // DEC-LC-002: Evaluate immediate trip completion
      await tripCompletionEngine.evaluateTripCompletion(trip._id, { session });

      if (!isExternalSession) {
        await session.commitTransaction();
        session.endSession();
      }

      return {
        success: true,
        journey,
        financialResult: {
          refundAmountMad: refundCentimes / 100,
          driverCompensationMad: driverCompCentimes / 100,
          platformFeeMad: platformFeeCentimes / 100
        }
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
   * Driver triggers No-Show after arrival and 5-minute geofenced wait.
   */
  async recordNoShow(journeyId, driverId, options = {}) {
    const session = options.session || await mongoose.startSession();
    const isExternalSession = !!options.session;

    if (!isExternalSession) session.startTransaction();

    try {
      const journey = await PassengerJourney.findById(journeyId).session(session);
      if (!journey) throw new Error('PassengerJourney not found');

      JourneyStateMachine.validateTransition(journey.status, JourneyStateMachine.STATES.NO_SHOW);

      const trip = await TripInstance.findById(journey.tripInstanceId).session(session);
      if (!trip) throw new Error('TripInstance not found');

      // Release Capacity
      capacityService.releaseSeats(trip, journey.pickupWaypointIndex, journey.dropoffWaypointIndex, journey.seatsBooked);
      await trip.save({ session });

      // No-Show Financial Rule: 80% to driver, 20% to platform
      const totalCentimes = Math.round(journey.fareAmountMad * 100);
      const driverCompCentimes = Math.round(totalCentimes * 0.80);
      const platformFeeCentimes = totalCentimes - driverCompCentimes;

      const passenger = await User.findById(journey.passengerId).session(session);
      const driver = await User.findById(driverId).session(session);

      if (journey.paymentType === 'DIGITAL_ESCROW') {
        const journal = new FinancialJournal({
          referenceType: 'NO_SHOW_COMPENSATION',
          referenceId: journey._id,
          description: `No-Show compensation for journey ${journey._id}`,
          totalDebitCentimes: totalCentimes,
          totalCreditCentimes: driverCompCentimes + platformFeeCentimes,
          isBalanced: true
        });
        await journal.save({ session });

        const debitEscrow = new FinancialLedgerEntry({
          journalId: journal._id,
          accountId: '2010_LIABILITY_ESCROW_DIGITAL',
          userId: journey.passengerId,
          type: 'DEBIT',
          amountCentimes: totalCentimes,
          description: `Capture digital escrow on passenger no-show ${journey._id}`
        });

        const creditDriver = new FinancialLedgerEntry({
          journalId: journal._id,
          accountId: '2030_LIABILITY_DRIVER_PENDING',
          userId: driverId,
          type: 'CREDIT',
          amountCentimes: driverCompCentimes,
          description: `80% No-show compensation for driver ${driverId}`
        });

        const creditPlatform = new FinancialLedgerEntry({
          journalId: journal._id,
          accountId: '4000_REVENUE_PLATFORM_COMMISSION',
          type: 'CREDIT',
          amountCentimes: platformFeeCentimes,
          description: `20% No-show platform fee ${journey._id}`
        });

        await Promise.all([debitEscrow.save({ session }), creditDriver.save({ session }), creditPlatform.save({ session })]);

        if (passenger) {
          passenger.heldBalance = Number(Math.max(0, (passenger.heldBalance || 0) - journey.fareAmountMad).toFixed(2));
          await passenger.save({ session });
        }

        if (driver) {
          driver.pendingEarnings = Number(((driver.pendingEarnings || 0) + (driverCompCentimes / 100)).toFixed(2));
          await driver.save({ session });
        }
      }

      journey.status = JourneyStateMachine.STATES.NO_SHOW;
      await journey.save({ session });

      await outboxService.emit('PASSENGER_JOURNEY', journey._id, 'passenger.no_show', {
        journeyId: journey._id,
        tripInstanceId: trip._id,
        driverCompensationMad: driverCompCentimes / 100
      }, { session });

      // DEC-LC-002: Evaluate immediate trip completion
      await tripCompletionEngine.evaluateTripCompletion(trip._id, { session });

      if (!isExternalSession) {
        await session.commitTransaction();
        session.endSession();
      }

      return { success: true, journey, driverCompensationMad: driverCompCentimes / 100 };
    } catch (err) {
      if (!isExternalSession) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  }
}

module.exports = new CancellationService();
