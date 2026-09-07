const OutboxEvent = require('../models/OutboxEvent');

class OutboxService {
  /**
   * Commit an event into the transactional outbox table within the caller's session.
   * @param {string} aggregateType - 'TRIP_INSTANCE', 'PASSENGER_JOURNEY', etc.
   * @param {string|ObjectId} aggregateId - Aggregate root ID
   * @param {string} eventType - e.g. 'passenger.boarded'
   * @param {Object} payload - Event data payload
   * @param {Object} options - { session }
   */
  async emit(aggregateType, aggregateId, eventType, payload, options = {}) {
    const event = new OutboxEvent({
      aggregateType,
      aggregateId,
      eventType,
      payload,
      status: 'PENDING'
    });

    return await event.save({ session: options.session });
  }

  /**
   * Relay pending outbox events to subscribers (Socket.io / PubSub).
   * @param {Object} io - Socket.io server instance (optional)
   * @param {number} batchSize - Number of events to process per run
   */
  async processOutbox(io = null, batchSize = 50) {
    const events = await OutboxEvent.find({ status: 'PENDING' })
      .sort({ createdAt: 1 })
      .limit(batchSize);

    for (const event of events) {
      try {
        event.status = 'PROCESSING';
        await event.save();

        if (io) {
          // Broadcast to relevant room based on aggregate
          const room = `${event.aggregateType.toLowerCase()}:${event.aggregateId}`;
          io.to(room).emit(event.eventType, event.payload);
        }

        event.status = 'PUBLISHED';
        event.publishedAt = new Date();
        await event.save();
      } catch (err) {
        event.status = 'FAILED';
        event.retryCount += 1;
        event.lastError = err.message;
        await event.save();
      }
    }

    return events.length;
  }
}

module.exports = new OutboxService();
