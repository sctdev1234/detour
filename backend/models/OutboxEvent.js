const mongoose = require('mongoose');
const { Schema } = mongoose;

const OutboxEventSchema = new Schema({
  aggregateType: {
    type: String,
    enum: [
      'TRIP_INSTANCE',
      'PASSENGER_JOURNEY',
      'RIDE_REQUEST',
      'OFFER',
      'WALLET',
      'WITHDRAWAL',
      'DISPUTE'
    ],
    required: true,
    index: true
  },
  aggregateId: {
    type: Schema.Types.ObjectId,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    required: true,
    index: true
  },
  payload: {
    type: Schema.Types.Mixed,
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED'],
    default: 'PENDING',
    index: true
  },
  retryCount: {
    type: Number,
    default: 0
  },
  lastError: String,
  publishedAt: Date
}, {
  timestamps: { createdAt: true, updatedAt: true }
});

OutboxEventSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('OutboxEvent', OutboxEventSchema);
