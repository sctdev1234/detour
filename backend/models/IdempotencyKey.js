const mongoose = require('mongoose');
const { Schema } = mongoose;

const IdempotencyKeySchema = new Schema({
  key: { 
    type: String, 
    required: true, 
    unique: true, 
    index: true 
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true 
  },
  endpoint: { 
    type: String, 
    required: true 
  },
  requestHash: { 
    type: String, 
    required: true 
  },
  status: {
    type: String,
    enum: ['IN_FLIGHT', 'COMPLETED', 'FAILED'],
    default: 'IN_FLIGHT',
    index: true
  },
  responseStatus: Number,
  responseBody: Schema.Types.Mixed,
  lockedAt: { 
    type: Date, 
    default: Date.now 
  },
  completedAt: Date,
  expiresAt: { 
    type: Date, 
    required: true, 
    index: { expires: 0 } // TTL index based on exact expiration date
  }
}, { timestamps: true });

module.exports = mongoose.model('IdempotencyKey', IdempotencyKeySchema);
