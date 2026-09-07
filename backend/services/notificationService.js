/**
 * ---------------------------------------------------------------------------------
 * SERVICE: NotificationService (V2 Socket Gateway equivalent)
 * ---------------------------------------------------------------------------------
 * Purpose: Decoupled event listener that pushes data to external transports
 *          (Socket.io). Implements Sequence Numbers for event ordering and recovery.
 * Owner Domain: Notification Domain
 * ---------------------------------------------------------------------------------
 */

const DomainEventBus = require('../events/DomainEventBus');

// In-memory sequence tracker (Replace with Redis in distributed environment)
const driverSequences = new Map();

function getNextSequence(driverId) {
    const current = driverSequences.get(driverId?.toString()) || 0;
    const next = current + 1;
    driverSequences.set(driverId?.toString(), next);
    return next;
}

class NotificationService {
    /**
     * Initializes the service and attaches to the DomainEventBus.
     * @param {Object} io - Socket.io server instance
     */
    static initialize(io) {
        this.io = io;

        DomainEventBus.on('OfferCreated', (event) => this.handleOfferCreated(event));
        DomainEventBus.on('TripAssigned', (event) => this.handleTripAssigned(event));
        DomainEventBus.on('TripSearching', (event) => this.handleTripSearching(event));
        DomainEventBus.on('DriverCounteredOffer', (event) => this.handleCounterOffer(event));
        DomainEventBus.on('DriverAcceptedOffer', (event) => this.handleDriverAcceptedOffer(event));
        DomainEventBus.on('DriverRejectedOffer', (event) => this.handleDriverRejectedOffer(event));
        DomainEventBus.on('TripStatusUpdated', (event) => this.handleTripStatusUpdated(event));
        DomainEventBus.on('TripCompleted', (event) => this.handleTripCompleted(event));
        DomainEventBus.on('RecurringTemplatesLinked', (event) => this.handleRecurringTemplatesLinked(event));
        
        // SPRINT: Finance
        DomainEventBus.on('TripSettled', (event) => this.handleTripSettled(event));
        DomainEventBus.on('TripRefunded', (event) => this.handleTripRefunded(event));
        DomainEventBus.on('WithdrawalApproved', (event) => this.handleWithdrawalApproved(event));
        DomainEventBus.on('WithdrawalRejected', (event) => this.handleWithdrawalRejected(event));

        // Proximity / Tracking
        DomainEventBus.on('DriverApproaching', (event) => this.handleDriverApproaching(event));

        console.log('[NotificationService] Subscribed to DomainEventBus');
    }

    static emitToDriver(driverId, eventName, payload) {
        if (!this.io || !driverId) return;
        const seq = getNextSequence(driverId);
        this.io.to(`user:${driverId.toString()}`).emit(eventName, { ...payload, seq });
    }

    static emitToPassenger(passengerId, eventName, payload) {
        if (!this.io || !passengerId) return;
        // Simple unsequenced emit for passenger V1
        this.io.to(`user:${passengerId.toString()}`).emit(eventName, payload);
    }

    static handleOfferCreated(event) {
        const offer = event.payload;
        // Emit to the specific driver's room using the expected frontend event name
        this.emitToDriver(offer.driverId, 'dispatch:offer_dispatched', offer);
        // Note: Passenger will receive the offer only when the driver proposes an invitation!
    }

    static async handleTripAssigned(event) {
        const assignment = event.payload;
        // Notify driver - STRICT SECURITY: NEVER expose OTP to the driver!
        const driverAssignment = { ...assignment };
        delete driverAssignment.otp;
        delete driverAssignment.verificationOtp;
        this.emitToDriver(assignment.driverId, 'dispatch:trip_assigned_to_driver', driverAssignment);
        
        // Notify passenger via trip room and user channel
        if (assignment.tripInstanceId) {
            this.io.to(`trip:${assignment.tripInstanceId.toString()}`).emit('dispatch:driver_assigned', driverAssignment);
            try {
                const TripInstance = require('../models/TripInstance');
                const instance = await TripInstance.findById(assignment.tripInstanceId).select('passengerIds').lean();
                if (instance?.passengerIds) {
                    instance.passengerIds.forEach(pId => {
                        this.emitToPassenger(pId, 'dispatch:driver_assigned', assignment);
                    });
                }
            } catch (err) {
                console.error('[NotificationService] Error notifying passenger of assignment:', err);
            }
        }
    }

    static async handleTripSearching(event) {
        const instance = event.payload;
        if (!instance) return;
        try {
            const Route = require('../models/Route');
            const User = require('../models/User');
            const { evaluateCorridorMatch } = require('../utils/corridorMatcher');

            const activeDriverRoutes = await Route.find({ role: 'driver', status: 'active' }).lean();
            for (const dRoute of activeDriverRoutes) {
                if (!dRoute.userId) continue;
                // Verify driver is online
                const driverUser = await User.findById(dRoute.userId).select('driverStatus').lean();
                if (driverUser?.driverStatus !== 'ONLINE') continue;

                if (evaluateCorridorMatch(dRoute, instance).isMatch) {
                    this.emitToDriver(dRoute.userId, 'dispatch:trip_searching', {
                        instanceId: instance._id,
                        driverRouteId: dRoute._id,
                        pickup: instance.pickup,
                        destination: instance.destination
                    });
                }
            }
        } catch (err) {
            console.error('[NotificationService] Error targeting trip searching drivers:', err);
        }
    }

    static handleCounterOffer(event) {
        const payload = event.payload;
        // Forward counter to passenger
        // The driver awaits passenger response, handled by another event later.
        this.emitToPassenger(payload.passengerId, 'dispatch:counter_received', payload);
    }

    static handleDriverAcceptedOffer(event) {
        const payload = event.payload;
        // Optional passenger notification
    }

    static handleDriverRejectedOffer(event) {
        const payload = event.payload;
        // Optional passenger notification
    }

    static async handleTripStatusUpdated(event) {
        const payload = event.payload;
        // Broadcast trip status updates (EN_ROUTE, ARRIVED, STARTED, COMPLETED) to passenger
        if (payload.tripInstanceId) {
            this.io.to(`trip:${payload.tripInstanceId.toString()}`).emit('dispatch:trip_status_updated', payload);
            if (payload.driverId) {
                this.emitToDriver(payload.driverId, 'dispatch:trip_status_updated', payload);
            }
            try {
                const TripInstance = require('../models/TripInstance');
                const instance = await TripInstance.findById(payload.tripInstanceId).select('passengerIds driverId').lean();
                if (instance?.passengerIds) {
                    instance.passengerIds.forEach(pId => {
                        this.emitToPassenger(pId, 'dispatch:trip_status_updated', payload);
                    });
                }
            } catch (err) {
                console.error('[NotificationService] Error notifying passenger of trip status update:', err);
            }
        }
    }

    static async handleTripCompleted(event) {
        const payload = event?.payload || event || {};
        const tripInstanceId = payload.tripInstanceId;
        const driverId = payload.driverId;
        const statusPayload = {
            tripInstanceId,
            driverId,
            status: 'COMPLETED',
            completedAt: payload.completedAt || new Date()
        };

        if (tripInstanceId) {
            this.io?.to(`trip:${tripInstanceId.toString()}`).emit('dispatch:trip_status_updated', statusPayload);
            if (driverId) {
                this.emitToDriver(driverId, 'dispatch:trip_status_updated', statusPayload);
            }
            try {
                const TripInstance = require('../models/TripInstance');
                const instance = await TripInstance.findById(tripInstanceId).select('passengerIds').lean();
                if (instance?.passengerIds) {
                    instance.passengerIds.forEach(pId => {
                        this.emitToPassenger(pId, 'dispatch:trip_status_updated', statusPayload);
                    });
                }
            } catch (err) {
                console.error('[NotificationService] Error notifying passenger of trip completion:', err);
            }
        }
    }

    static handleRecurringTemplatesLinked(event) {
        const payload = event.payload;
        // Notify both passenger and driver that a recurring link was established
        if (payload.passengerId) {
            this.emitToPassenger(payload.passengerId, 'recurring:templates_linked', payload);
        }
        if (payload.driverId) {
            this.emitToDriver(payload.driverId, 'recurring:templates_linked', payload);
        }
    }

    // SPRINT: Finance Handlers
    static handleTripSettled(event) {
        const { tripId, clientId, driverId, receipt } = event.payload;
        this.emitToPassenger(clientId, 'finance:receipt_ready', { tripId, receipt });
        if (driverId) {
            this.emitToDriver(driverId, 'finance:earning_updated', { tripId, earning: receipt.driverEarning });
        }
    }

    static handleTripRefunded(event) {
        const { tripId, passengerId, driverId, amountTotal, reason } = event.payload;
        this.emitToPassenger(passengerId, 'finance:refund_issued', { tripId, amountTotal, reason });
        if (driverId) {
            this.emitToDriver(driverId, 'finance:earning_reversed', { tripId, amountTotal, reason });
        }
    }

    static handleWithdrawalApproved(event) {
        const { driverId, amount } = event.payload;
        this.emitToDriver(driverId, 'finance:withdrawal_approved', { amount });
    }

    static handleWithdrawalRejected(event) {
        const { driverId, amount, reason } = event.payload;
        this.emitToDriver(driverId, 'finance:withdrawal_rejected', { amount, reason });
    }

    static handleDriverApproaching(event) {
        const { tripId, driverId, clientId, distance } = event.payload;
        this.emitToPassenger(clientId, 'driver_approaching', { tripId, driverId, distance });
    }

    /**
     * Helper to get current sequence for recovery API
     */
    static getCurrentSequence(driverId) {
        return driverSequences.get(driverId?.toString()) || 0;
    }
}

module.exports = NotificationService;
