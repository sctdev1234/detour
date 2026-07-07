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
        DomainEventBus.on('RecurringTemplatesLinked', (event) => this.handleRecurringTemplatesLinked(event));
        
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
        // Also emit to the passenger that an offer came in
        this.emitToPassenger(offer.passengerId, 'dispatch:offer_received', offer);
    }

    static handleTripAssigned(event) {
        const assignment = event.payload;
        // Notify driver
        this.emitToDriver(assignment.driverId, 'dispatch:trip_assigned_to_driver', assignment);
        
        // Notify passenger
        if (assignment.tripInstanceId) {
            this.io.to(`trip:${assignment.tripInstanceId.toString()}`).emit('dispatch:driver_assigned', assignment);
        }
    }

    static handleTripSearching(event) {
        const instance = event.payload;
        // Broadcast to nearby drivers (simplified for now)
        this.io.emit('dispatch:trip_searching', { instanceId: instance._id, pickup: instance.pickup });
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

    static handleTripStatusUpdated(event) {
        const payload = event.payload;
        // Broadcast trip status updates (EN_ROUTE, ARRIVED, STARTED, COMPLETED) to passenger
        if (payload.tripInstanceId) {
            this.io.to(`trip:${payload.tripInstanceId.toString()}`).emit('dispatch:trip_status_updated', payload);
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

    /**
     * Helper to get current sequence for recovery API
     */
    static getCurrentSequence(driverId) {
        return driverSequences.get(driverId?.toString()) || 0;
    }
}

module.exports = NotificationService;
