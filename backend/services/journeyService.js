const mongoose = require('mongoose');
const PassengerJourney = require('../models/PassengerJourney');
const TripInstance = require('../models/TripInstance');
const DisputeRecord = require('../models/DisputeRecord');
const capacityService = require('./capacityService');
const escrowService = require('./escrowService');
const settlementService = require('./settlementService');
const outboxService = require('./outboxService');
const JourneyStateMachine = require('../state/JourneyStateMachine');
const tripCompletionEngine = require('./tripCompletionEngine');
const crypto = require('crypto');

class JourneyService {
  /**
   * Generates a secure random 4-digit verification OTP
   */
  generateOtp() {
    return crypto.randomInt(1000, 9999).toString();
  }

  /**
   * Books a seat on a TripInstance for an individual passenger within an ACID transaction.
   */
  async bookSeat({
    tripInstanceId,
    passengerId,
    pickupWaypointIndex = 0,
    dropoffWaypointIndex = 1,
    seatsBooked = 1,
    paymentType = 'DIGITAL_ESCROW',
    fareAmountMad
  }, options = {}) {
    const session = options.session || await mongoose.startSession();
    const isExternalSession = !!options.session;

    if (!isExternalSession) {
      session.startTransaction();
    }

    try {
      const trip = await TripInstance.findById(tripInstanceId).session(session);
      if (!trip) {
        throw new Error('TripInstance not found');
      }

      if (!['SCHEDULED', 'OFFERS_OPEN', 'ASSIGNED'].includes(trip.status)) {
        throw new Error(`Cannot book seat on trip with status: ${trip.status}`);
      }

      // 1. Capacity Validation & Reservation
      capacityService.reserveSeats(trip, pickupWaypointIndex, dropoffWaypointIndex, seatsBooked);
      if (!trip.passengerIds.includes(passengerId)) {
        trip.passengerIds.push(passengerId);
      }
      await trip.save({ session });

      // 2. Generate OTP
      const verificationOtp = this.generateOtp();

      // 3. Create PassengerJourney
      const journey = new PassengerJourney({
        tripInstanceId,
        passengerId,
        pickupWaypointIndex,
        dropoffWaypointIndex,
        seatsBooked,
        paymentType,
        fareAmountMad,
        verificationOtp,
        status: 'BOOKED'
      });
      await journey.save({ session });

      // 4. Financial Escrow Hold
      let escrowJournal;
      if (paymentType === 'DIGITAL_ESCROW') {
        escrowJournal = await escrowService.holdDigitalEscrow(passengerId, fareAmountMad, journey._id, session);
      } else if (paymentType === 'CASH_ON_BOARDING') {
        const estimatedCommissionMad = Number((fareAmountMad * 0.15).toFixed(2));
        escrowJournal = await escrowService.holdCashCommission(trip.driverId, estimatedCommissionMad, journey._id, session);
      }

      journey.escrowJournalId = escrowJournal ? escrowJournal._id : null;
      await journey.save({ session });

      // 5. Emit Outbox Event
      await outboxService.emit('PASSENGER_JOURNEY', journey._id, 'passenger.booked', {
        journeyId: journey._id,
        tripInstanceId,
        passengerId,
        fareAmountMad,
        paymentType
      }, { session });

      if (!isExternalSession) {
        await session.commitTransaction();
        session.endSession();
      }

      return { success: true, journey, trip };
    } catch (err) {
      if (!isExternalSession) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  }

  /**
   * Driver marks arrival at passenger pickup stop.
   */
  async recordDriverArrived(journeyId, options = {}) {
    const journey = await PassengerJourney.findById(journeyId);
    if (!journey) throw new Error('PassengerJourney not found');

    JourneyStateMachine.validateTransition(journey.status, JourneyStateMachine.STATES.DRIVER_ARRIVED);

    journey.status = JourneyStateMachine.STATES.DRIVER_ARRIVED;
    await journey.save();

    await outboxService.emit('PASSENGER_JOURNEY', journey._id, 'trip.driver_arrived', {
      journeyId: journey._id,
      tripInstanceId: journey.tripInstanceId,
      passengerId: journey.passengerId
    });

    return journey;
  }

  /**
   * Verify passenger OTP and mark boarded.
   * Single canonical boarding implementation.
   */
  async boardPassenger(journeyId, inputOtp, options = {}) {
    const isExternalSession = !!options.session;
    const maxRetries = isExternalSession ? 1 : 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = options.session || await mongoose.startSession();

      if (!isExternalSession) {
        session.startTransaction();
      }

      try {
        if (!journeyId || !mongoose.Types.ObjectId.isValid(journeyId)) {
          throw new Error('Invalid or missing journey ID');
        }

        if (inputOtp === undefined || inputOtp === null || String(inputOtp).trim() === '') {
          throw new Error('Verification OTP code is required');
        }

        const journey = await PassengerJourney.findById(journeyId).session(session);
        if (!journey) {
          throw new Error('PassengerJourney not found');
        }

        // 1. Validate Pre-Boarding Journey State
        if (journey.status === 'BOARDED') {
          throw new Error('Passenger is already boarded');
        }
        if (['COMPLETED', 'DROPPED_OFF'].includes(journey.status)) {
          throw new Error(`Cannot board: Journey is already ${journey.status}`);
        }
        if (journey.status && (journey.status.startsWith('CANCELLED') || journey.status === 'NO_SHOW')) {
          throw new Error(`Cannot board: Journey has been ${journey.status}`);
        }
        JourneyStateMachine.validateTransition(journey.status, JourneyStateMachine.STATES.BOARDED);

        // 2. Validate OTP & Replay Prevention
        if (!journey.verificationOtp || journey.otpConsumed) {
          throw new Error('Verification OTP has already been consumed');
        }

        const cleanInputOtp = String(inputOtp).trim();
        if (journey.verificationOtp !== cleanInputOtp) {
          throw new Error('Invalid verification OTP code');
        }

        // 3. Validate passenger if provided
        if (options.passengerId && journey.passengerId.toString() !== options.passengerId.toString()) {
          throw new Error('Passenger does not match this journey');
        }

        // 4. Validate TripInstance & Driver Authorization
        let trip = null;
        if (journey.tripInstanceId) {
          trip = await TripInstance.findById(journey.tripInstanceId).session(session);
        }

        if (options.driverId && !trip) {
          throw new Error('TripInstance not found for journey');
        }

        if (trip) {
          const allowedTripStatuses = ['ASSIGNED', 'EN_ROUTE', 'EN_ROUTE_TO_ORIGIN', 'ARRIVED', 'BOARDED'];
          if (!allowedTripStatuses.includes(trip.status)) {
            throw new Error(`Cannot board passenger: Trip is in invalid state (${trip.status})`);
          }

          if (options.driverId) {
            const TripAssignment = require('../models/TripAssignment');
            const assignment = await TripAssignment.findOne({
              tripInstanceId: trip._id,
              driverId: options.driverId,
              status: 'ACTIVE'
            }).session(session);

            const isDriverMatch = (trip.driverId && trip.driverId.toString() === options.driverId.toString()) || assignment;
            if (!isDriverMatch) {
              throw new Error('Unauthorized: Driver is not assigned to this trip');
            }
          }
        }

        // 5. Transition Journey to BOARDED & Mark OTP consumed
        journey.status = JourneyStateMachine.STATES.BOARDED;
        journey.boardedAt = new Date();
        journey.otpConsumed = true;
        journey.otpConsumedAt = new Date();
        journey.verificationOtp = null; // Replay prevention
        await journey.save({ session });

        // 6. Update TripInstance state
        let oldTripStatus = null;
        if (trip) {
          oldTripStatus = trip.status;
          const TripStateMachine = require('../state/TripStateMachine');
          if (trip.status !== 'BOARDED' && trip.status !== 'STARTED') {
            TripStateMachine.validateTransition(trip.status, TripStateMachine.STATES.BOARDED);
            trip.status = TripStateMachine.STATES.BOARDED;
            if (!trip.stateTimestamps) trip.stateTimestamps = {};
            trip.stateTimestamps.boardedAt = new Date();
            await trip.save({ session });
          }
        }

        // 7. Transactional Outbox Event
        await outboxService.emit('PASSENGER_JOURNEY', journey._id, 'passenger.boarded', {
          journeyId: journey._id,
          tripInstanceId: journey.tripInstanceId,
          passengerId: journey.passengerId,
          boardedAt: journey.boardedAt
        }, { session });

        if (!isExternalSession) {
          await session.commitTransaction();
        }

        // 8. Post-commit event emissions
        try {
          const DomainEventBus = require('../events/DomainEventBus');
          DomainEventBus.publish('PassengerBoarded', journey._id, {
            journeyId: journey._id,
            tripInstanceId: trip ? trip._id : journey.tripInstanceId,
            passengerId: journey.passengerId,
            driverId: trip ? trip.driverId : null
          });

          if (trip) {
            DomainEventBus.publish('TripStatusUpdated', trip._id, {
              tripInstanceId: trip._id,
              driverId: trip.driverId,
              fromStatus: oldTripStatus,
              toStatus: trip.status
            });
          }

          const NotificationService = require('./notificationService');
          NotificationService.emitToPassenger(journey.passengerId, 'dispatch:passenger_boarded', {
            journeyId: journey._id,
            tripInstanceId: trip ? trip._id : journey.tripInstanceId
          });

          if (trip && trip.driverId) {
            NotificationService.emitToDriver(trip.driverId, 'dispatch:passenger_boarded', {
              journeyId: journey._id,
              tripInstanceId: trip._id,
              passengerId: journey.passengerId
            });
          }
        } catch (evtErr) {
          console.error('[JourneyService] Error publishing post-commit events:', evtErr);
        }

        return journey;
      } catch (err) {
        if (!isExternalSession) {
          try { await session.abortTransaction(); } catch (abortErr) {}
        }

        const isTransient = (err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError')) ||
                            (err.errorLabels && err.errorLabels.includes('TransientTransactionError')) ||
                            (err.message && err.message.includes('catalog changes')) ||
                            err.code === 112;

        if (isTransient && attempt < maxRetries) {
          const delay = Math.floor(50 * attempt + Math.random() * 50);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }

        throw err;
      } finally {
        if (!isExternalSession) {
          session.endSession();
        }
      }
    }
  }

  /**
   * Confirm dropoff and trigger atomic settlement.
   */
  async dropoffPassenger(journeyId, options = {}) {
    const isExternalSession = !!options.session;
    const maxRetries = isExternalSession ? 1 : 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = options.session || await mongoose.startSession();
      if (!isExternalSession) session.startTransaction();

      try {
        if (!journeyId || !mongoose.Types.ObjectId.isValid(journeyId)) {
          throw new Error('Invalid or missing journey ID');
        }

        const journey = await PassengerJourney.findById(journeyId).session(session);
        if (!journey) throw new Error('PassengerJourney not found');

        JourneyStateMachine.validateTransition(journey.status, JourneyStateMachine.STATES.DROPPED_OFF);

        const trip = await TripInstance.findById(journey.tripInstanceId).session(session);
        if (!trip) throw new Error('TripInstance not found');

        // Validate driver authorization if driverId provided
        if (options.driverId) {
          const TripAssignment = require('../models/TripAssignment');
          const assignment = await TripAssignment.findOne({
            tripInstanceId: trip._id,
            driverId: options.driverId,
            status: 'ACTIVE'
          }).session(session);

          const isDriverMatch = (trip.driverId && trip.driverId.toString() === options.driverId.toString()) || assignment;
          if (!isDriverMatch) {
            throw new Error('Unauthorized: Driver is not assigned to this trip');
          }
        }

        journey.status = JourneyStateMachine.STATES.DROPPED_OFF;
        journey.droppedOffAt = new Date();
        await journey.save({ session });

        // Settle Passenger Financials
        const settlement = await settlementService.settlePassengerJourney(journey._id, trip.driverId, session);

        await outboxService.emit('PASSENGER_JOURNEY', journey._id, 'passenger.dropped_off', {
          journeyId: journey._id,
          tripInstanceId: trip._id,
          passengerId: journey.passengerId,
          taxSnapshot: settlement.taxSnapshot
        }, { session });

        // DEC-LC-002: Evaluate immediate trip completion
        await tripCompletionEngine.evaluateTripCompletion(trip._id, { session });

        if (!isExternalSession) {
          await session.commitTransaction();
        }

        // Post-commit domain events
        try {
          const DomainEventBus = require('../events/DomainEventBus');
          DomainEventBus.publish('PassengerDroppedOff', journey._id, {
            journeyId: journey._id,
            tripInstanceId: trip._id,
            passengerId: journey.passengerId,
            driverId: trip.driverId
          });

          const NotificationService = require('./notificationService');
          NotificationService.emitToPassenger(journey.passengerId, 'dispatch:passenger_dropped_off', {
            journeyId: journey._id,
            tripInstanceId: trip._id
          });
        } catch (evtErr) {
          console.error('[JourneyService] Error publishing post-commit dropoff events:', evtErr);
        }

        return { success: true, journey, settlement };
      } catch (err) {
        if (!isExternalSession) {
          try { await session.abortTransaction(); } catch (abortErr) {}
        }

        const isTransient = (err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError')) ||
                            (err.errorLabels && err.errorLabels.includes('TransientTransactionError')) ||
                            (err.message && err.message.includes('catalog changes')) ||
                            err.code === 112;

        if (isTransient && attempt < maxRetries) {
          const delay = Math.floor(50 * attempt + Math.random() * 50);
          await new Promise(res => setTimeout(res, delay));
          continue;
        }

        throw err;
      } finally {
        if (!isExternalSession) {
          session.endSession();
        }
      }
    }
  }

  /**
   * Open a dispute on a journey.
   */
  async disputeJourney({ journeyId, initiatedBy, disputeType, reason }, options = {}) {
    const journey = await PassengerJourney.findById(journeyId);
    if (!journey) throw new Error('PassengerJourney not found');

    JourneyStateMachine.validateTransition(journey.status, JourneyStateMachine.STATES.DISPUTED);

    journey.status = JourneyStateMachine.STATES.DISPUTED;
    await journey.save();

    const dispute = new DisputeRecord({
      passengerJourneyId: journey._id,
      tripInstanceId: journey.tripInstanceId,
      initiatedBy,
      disputeType,
      reason,
      status: 'OPEN'
    });
    await dispute.save();

    journey.disputeId = dispute._id;
    await journey.save();

    await outboxService.emit('DISPUTE', dispute._id, 'dispute.created', {
      disputeId: dispute._id,
      journeyId: journey._id,
      tripInstanceId: journey.tripInstanceId
    });

    // DEC-LC-002: Re-evaluate trip status in case trip moves to CLOSED_PENDING_DISPUTES
    await tripCompletionEngine.evaluateTripCompletion(journey.tripInstanceId);

    return { success: true, dispute, journey };
  }
}

module.exports = new JourneyService();
