const mongoose = require('mongoose');
const TripInstance = require('../models/TripInstance');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
const TripStateMachine = require('../state/TripStateMachine');
const JourneyStateMachine = require('../state/JourneyStateMachine');
const outboxService = require('./outboxService');
const DomainEventBus = require('../events/DomainEventBus');

class TripCompletionEngine {
  /**
   * Primary canonical evaluation: Evaluates whether a TripInstance has completed
   * based on the physical and financial lifecycle states of all its PassengerJourneys.
   *
   * @param {ObjectId|string} tripInstanceId 
   * @param {Object} options - { session }
   * @returns {Promise<{ changed: boolean, status: string, trip: Object, reason?: string }>}
   */
  async evaluateTripCompletion(tripInstanceId, options = {}) {
    const isExternalSession = !!options.session;
    const maxRetries = isExternalSession ? 1 : 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const session = options.session || await mongoose.startSession();
      if (!isExternalSession) {
        session.startTransaction();
      }

      try {
        const trip = await TripInstance.findById(tripInstanceId).session(session);
        if (!trip) {
          throw new Error(`TripInstance ${tripInstanceId} not found`);
        }

        // Idempotency: Already in terminal state
        if (['COMPLETED', 'CANCELLED'].includes(trip.status)) {
          if (!isExternalSession) {
            await session.commitTransaction();
          }
          return { changed: false, status: trip.status, trip };
        }

        // Fetch all journeys associated with this trip instance
        const journeys = await PassengerJourney.find({ tripInstanceId: trip._id }).session(session);

        // If no passengers ever booked, do not auto-complete running trips prematurely
        if (journeys.length === 0) {
          if (!isExternalSession) {
            await session.commitTransaction();
          }
          return { changed: false, status: trip.status, trip, reason: 'NO_JOURNEYS' };
        }

        // 1. Check if any journey is physically or execution active (not execution terminal)
        const hasActiveJourneys = journeys.some(j => !JourneyStateMachine.isExecutionTerminal(j.status));

        if (hasActiveJourneys) {
          if (!isExternalSession) {
            await session.commitTransaction();
          }
          return { changed: false, status: trip.status, trip, reason: 'PHYSICALLY_ACTIVE_JOURNEYS_REMAIN' };
        }

        // 2. All journeys have finished physical execution (each is either terminal or disputed).
        // Check for unresolved disputes.
        const hasUnresolvedDisputes = journeys.some(j => j.status === JourneyStateMachine.STATES.DISPUTED);

        const targetStatus = hasUnresolvedDisputes
          ? TripStateMachine.STATES.CLOSED_PENDING_DISPUTES
          : TripStateMachine.STATES.COMPLETED;

        // Idempotency: If trip is already in the target status (e.g. already CLOSED_PENDING_DISPUTES), do nothing!
        if (trip.status === targetStatus) {
          if (!isExternalSession) {
            await session.commitTransaction();
          }
          return { changed: false, status: trip.status, trip };
        }

        // Validate & transition Trip state
        try {
          TripStateMachine.validateTransition(trip.status, targetStatus);
        } catch {
          // If direct transition from intermediate state (e.g. BOARDED, EN_ROUTE), force target state safely
        }
        trip.status = targetStatus;

        const now = new Date();
        trip.stateTimestamps = trip.stateTimestamps || {};
        if (targetStatus === TripStateMachine.STATES.COMPLETED) {
          trip.stateTimestamps.completedAt = now;
        } else {
          trip.stateTimestamps.closedPendingDisputesAt = now;
        }

        await trip.save({ session });

        // 3. Release Driver Active Trip Lock and Restore Availability
        if (trip.driverId) {
          const driver = await User.findById(trip.driverId).session(session);
          if (driver && driver.driverStatus === 'BUSY') {
            driver.driverStatus = 'ONLINE';
            await driver.save({ session });
          }
        }

        // 4. Emit Transactional Outbox Event
        const eventType = targetStatus === TripStateMachine.STATES.COMPLETED
          ? 'trip.completed'
          : 'trip.closed_pending_disputes';

        await outboxService.emit('TRIP_INSTANCE', trip._id, eventType, {
          tripInstanceId: trip._id,
          driverId: trip.driverId,
          status: targetStatus,
          totalJourneys: journeys.length,
          hasUnresolvedDisputes,
          completedAt: now
        }, { session });

        if (!isExternalSession) {
          await session.commitTransaction();
        }

        // 5. Post-commit Domain Event emission (only once upon state change)
        try {
          if (targetStatus === TripStateMachine.STATES.COMPLETED) {
            DomainEventBus.publish('TripCompleted', {
              tripInstanceId: trip._id,
              driverId: trip.driverId,
              completedAt: now
            }, trip._id);
          } else if (targetStatus === TripStateMachine.STATES.CLOSED_PENDING_DISPUTES) {
            DomainEventBus.publish('TripClosedPendingDisputes', {
              tripInstanceId: trip._id,
              driverId: trip.driverId
            }, trip._id);
          }
        } catch (evtErr) {
          console.error('[TripCompletionEngine] Post-commit domain event error:', evtErr.message);
        }

        return { changed: true, status: targetStatus, trip };
      } catch (err) {
        if (!isExternalSession) {
          try { await session.abortTransaction(); } catch (abortErr) {}
        }

        const isTransient = (err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError')) ||
                            (err.errorLabels && err.errorLabels.includes('TransientTransactionError')) ||
                            (err.message && err.message.includes('catalog changes')) ||
                            err.name === 'VersionError' ||
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
   * Secondary Repair / Reconciliation Worker:
   * Periodically scans running or started trips to reconcile any that missed immediate completion
   * due to unexpected process terminations, crashes, or legacy inconsistencies.
   *
   * @param {number} batchSize 
   * @returns {Promise<{ examinedCount: number, completedCount: number }>}
   */
  async reconcileStaleTrips(batchSize = 25) {
    const candidateTrips = await TripInstance.find({
      status: { $in: ['STARTED', 'IN_PROGRESS', 'BOARDED', 'ARRIVED', 'EN_ROUTE', 'CLOSED_PENDING_DISPUTES'] }
    }).limit(batchSize);

    let completedCount = 0;

    for (const trip of candidateTrips) {
      try {
        const result = await this.evaluateTripCompletion(trip._id);
        if (result.changed) {
          completedCount += 1;
        }
      } catch (err) {
        console.error(`[TripCompletionEngine] Reconciliation failed for trip ${trip._id}:`, err.message);
      }
    }

    return { examinedCount: candidateTrips.length, completedCount };
  }
}

module.exports = new TripCompletionEngine();
