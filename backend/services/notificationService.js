/**
 * ---------------------------------------------------------------------------------
 * SERVICE: NotificationService
 * ---------------------------------------------------------------------------------
 * Purpose: Decoupled event listener that pushes data to external transports
 *          (Socket.io, Push, SMS) without blocking domain logic.
 * Owner Domain: Notification Domain
 * ---------------------------------------------------------------------------------
 */

const DomainEventBus = require('../events/DomainEventBus');

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
        
        console.log('[NotificationService] Subscribed to DomainEventBus');
    }

    static handleOfferCreated(event) {
        if (!this.io) return;
        const offer = event.payload;
        // Emit to the specific driver's room
        this.io.to(offer.driverId.toString()).emit('dispatch:offer_received', offer);
        // Also emit to the passenger that an offer came in
        this.io.to(offer.passengerId.toString()).emit('dispatch:offer_received', offer);
    }

    static handleTripAssigned(event) {
        if (!this.io) return;
        const assignment = event.payload;
        // Notify both parties of the assignment lock
        this.io.to(assignment.driverId.toString()).emit('dispatch:driver_assigned', assignment);
        // We might need to look up passengerIds from instance, but the payload should contain it ideally.
        if (assignment.tripInstanceId) {
            this.io.to(assignment.tripInstanceId.toString()).emit('dispatch:driver_assigned', assignment);
        }
    }

    static handleTripSearching(event) {
        if (!this.io) return;
        const instance = event.payload;
        // Broadcast to nearby drivers (simplified for now, actual implementation would use room based on grid/geo)
        this.io.emit('dispatch:trip_searching', { instanceId: instance._id, pickup: instance.pickup });
    }
}

module.exports = NotificationService;
