const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
const TaxService = require('./tax/TaxService');
const JourneyStateMachine = require('../state/JourneyStateMachine');

class SettlementService {
  /**
   * Settle an individual completed PassengerJourney atomically.
   * @param {ObjectId} journeyId 
   * @param {ObjectId} driverId 
   * @param {Object} session - Mongoose session
   */
  async settlePassengerJourney(journeyId, driverId, session) {
    const journey = await PassengerJourney.findById(journeyId).session(session);
    if (!journey) {
      throw new Error(`PassengerJourney ${journeyId} not found`);
    }

    if (journey.status === 'COMPLETED') {
      return { alreadySettled: true, journey };
    }

    if (journey.status === 'DISPUTED') {
      throw new Error('Cannot settle journey in DISPUTED status. Dispute must be resolved via disputeService.');
    }

    const existingJournal = await FinancialJournal.findOne({
      referenceType: { $in: ['TRIP_SETTLEMENT', 'ESCROW_RELEASE_CASH_COMMISSION'] },
      referenceId: journey._id
    }).session(session);
    if (existingJournal) {
      return { alreadySettled: true, journey, journal: existingJournal };
    }

    // 1. Generate Immutable Tax & Commission Snapshot
    const taxSnapshot = TaxService.calculateSnapshot(journey.fareAmountMad);
    journey.taxSnapshot = taxSnapshot;

    const grossCentimes = Math.round(taxSnapshot.grossFare * 100);
    const detourNetCentimes = Math.round(taxSnapshot.detourNetRevenue * 100);
    const taxCentimes = Math.round(taxSnapshot.taxAmount * 100);
    const driverNetCentimes = Math.round(taxSnapshot.driverNetAmount * 100);
    const commissionGrossCentimes = Math.round(taxSnapshot.commissionGrossAmount * 100);

    const passenger = await User.findById(journey.passengerId).session(session);
    const driver = await User.findById(driverId).session(session);

    if (journey.paymentType === 'DIGITAL_ESCROW') {
      // Create Digital Settlement Journal
      const journal = new FinancialJournal({
        referenceType: 'TRIP_SETTLEMENT',
        referenceId: journey._id,
        description: `Digital settlement for journey ${journey._id}`,
        totalDebitCentimes: grossCentimes,
        totalCreditCentimes: detourNetCentimes + taxCentimes + driverNetCentimes,
        isBalanced: true,
        taxSnapshot,
        metadata: { journeyId, driverId, passengerId: journey.passengerId }
      });
      await journal.save({ session });

      // Ledger Entries
      const debitEscrow = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2010_LIABILITY_ESCROW_DIGITAL',
        userId: journey.passengerId,
        type: 'DEBIT',
        amountCentimes: grossCentimes,
        description: `Release digital escrow for journey ${journey._id}`
      });

      const creditRevenue = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '4000_REVENUE_PLATFORM_COMMISSION',
        type: 'CREDIT',
        amountCentimes: detourNetCentimes,
        description: `Platform commission revenue for journey ${journey._id}`
      });

      const creditTax = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2050_LIABILITY_VAT_COLLECTED',
        type: 'CREDIT',
        amountCentimes: taxCentimes,
        description: `VAT liability for journey ${journey._id}`
      });

      const creditDriver = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2030_LIABILITY_DRIVER_PENDING',
        userId: driverId,
        type: 'CREDIT',
        amountCentimes: driverNetCentimes,
        description: `Driver net earning pending clearance for journey ${journey._id}`
      });

      await Promise.all([
        debitEscrow.save({ session }),
        creditRevenue.save({ session }),
        creditTax.save({ session }),
        creditDriver.save({ session })
      ]);

      // Update Materialized Views
      if (passenger) {
        passenger.heldBalance = Number(Math.max(0, (passenger.heldBalance || 0) - taxSnapshot.grossFare).toFixed(2));
        await passenger.save({ session });
      }

      if (driver) {
        driver.pendingEarnings = Number(((driver.pendingEarnings || 0) + taxSnapshot.driverNetAmount).toFixed(2));
        await driver.save({ session });
      }

      journey.driverEarningsPendingAt = new Date();
    } else if (journey.paymentType === 'CASH_ON_BOARDING') {
      // Create Cash Commission Capture Journal
      const journal = new FinancialJournal({
        referenceType: 'ESCROW_RELEASE_CASH_COMMISSION',
        referenceId: journey._id,
        description: `Capture cash commission for journey ${journey._id}`,
        totalDebitCentimes: commissionGrossCentimes,
        totalCreditCentimes: detourNetCentimes + taxCentimes,
        isBalanced: true,
        taxSnapshot,
        metadata: { journeyId, driverId }
      });
      await journal.save({ session });

      const debitCashEscrow = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2020_LIABILITY_ESCROW_CASH_COMMISSION',
        userId: driverId,
        type: 'DEBIT',
        amountCentimes: commissionGrossCentimes,
        description: `Debit prepaid cash commission escrow for journey ${journey._id}`
      });

      const creditRevenue = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '4000_REVENUE_PLATFORM_COMMISSION',
        type: 'CREDIT',
        amountCentimes: detourNetCentimes,
        description: `Platform cash commission revenue for journey ${journey._id}`
      });

      const creditTax = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2050_LIABILITY_VAT_COLLECTED',
        type: 'CREDIT',
        amountCentimes: taxCentimes,
        description: `VAT liability for cash journey ${journey._id}`
      });

      await Promise.all([
        debitCashEscrow.save({ session }),
        creditRevenue.save({ session }),
        creditTax.save({ session })
      ]);

      if (driver) {
        driver.heldBalance = Number(Math.max(0, (driver.heldBalance || 0) - taxSnapshot.commissionGrossAmount).toFixed(2));
        await driver.save({ session });
      }
    }

    JourneyStateMachine.validateTransition(journey.status, JourneyStateMachine.STATES.COMPLETED);
    journey.status = JourneyStateMachine.STATES.COMPLETED;
    journey.droppedOffAt = journey.droppedOffAt || new Date();
    journey.ratingWindowExpiresAt = new Date(Date.now() + 48 * 3600 * 1000);
    await journey.save({ session });

    return { success: true, journey, taxSnapshot };
  }

  /**
   * Settle an entire TripInstance by settling every associated PassengerJourney independently.
   * @param {ObjectId} tripInstanceId 
   * @param {Object} options - { session }
   */
  async settleTripInstance(tripInstanceId, options = {}) {
    const mongoose = require('mongoose');
    const TripInstance = require('../models/TripInstance');
    const session = options.session || await mongoose.startSession();
    const isExternalSession = !!options.session;

    if (!isExternalSession) session.startTransaction();

    try {
      const trip = await TripInstance.findById(tripInstanceId).session(session);
      if (!trip) throw new Error(`TripInstance ${tripInstanceId} not found`);

      const journeys = await PassengerJourney.find({
        tripInstanceId: trip._id,
        status: { $in: ['DROPPED_OFF', 'BOARDED', 'BOOKED'] }
      }).session(session);

      const settlementResults = [];
      for (const journey of journeys) {
        const res = await this.settlePassengerJourney(journey._id, trip.driverId, session);
        settlementResults.push(res);
      }

      trip.financialStatus = 'SETTLED';
      await trip.save({ session });

      const tripCompletionEngine = require('./tripCompletionEngine');
      const completionResult = await tripCompletionEngine.evaluateTripCompletion(trip._id, { session });

      if (!isExternalSession) {
        await session.commitTransaction();
        session.endSession();
      }

      return { success: true, trip: completionResult.trip || trip, settledJourneysCount: settlementResults.length, settlementResults };
    } catch (err) {
      if (!isExternalSession) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  }
}

module.exports = new SettlementService();
