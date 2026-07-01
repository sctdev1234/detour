/**
 * ---------------------------------------------------------------------------------
 * SERVICE: DomainEventBus
 * ---------------------------------------------------------------------------------
 * Purpose: A decoupled abstraction over Node's native EventEmitter.
 * Owner Domain: Shared Core
 * Capabilities: 
 *   - Ensures all events follow the Event Versioning mandate.
 *   - Prevents domain services from directly coupling to each other or Socket.io.
 *   - Standardizes the `eventId`, `eventType`, `occurredAt`, `aggregateId` payload.
 * ---------------------------------------------------------------------------------
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');
const context = require('../utils/context');

class DomainEventBus extends EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50); // Prevent memory leak warnings on high load
    }

    /**
     * Publishes a versioned domain event to the internal bus.
     * @param {string} eventType - The type of event (e.g., 'TripInstanceCreated')
     * @param {string} aggregateId - The ID of the root entity (e.g., tripInstanceId)
     * @param {object} payload - The event data
     * @param {number} eventVersion - The schema version of the event (default: 1)
     */
    publish(eventType, aggregateId, payload, eventVersion = 1) {
        // Extract Observability Metadata
        const correlationId = context.get('correlationId') || 'SYSTEM';
        const authenticatedUserId = context.get('authenticatedUserId');
        const requestId = context.get('requestId');

        const event = {
            eventId: crypto.randomUUID(),
            eventType,
            eventVersion,
            occurredAt: new Date().toISOString(),
            aggregateId: aggregateId ? aggregateId.toString() : null,
            payload,
            metadata: {
                correlationId,
                requestId,
                actorId: authenticatedUserId || 'SYSTEM'
            }
        };

        // Emit internally for Node.js services (NotificationService, Analytics, etc.)
        this.emit(eventType, event);
        
        // Structure the log so Datadog/ELK can parse it easily
        console.log(JSON.stringify({
            level: 'info',
            type: 'DOMAIN_EVENT',
            event: eventType,
            aggregateId,
            correlationId,
            actorId: event.metadata.actorId
        }));
        
        return event;
    }
}

// Singleton export
module.exports = new DomainEventBus();
