const mongoose = require('mongoose');
const { Schema } = mongoose;

const RecurringRideRequestSchema = new Schema({
  passengerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  origin: {
    name: { type: String, required: true },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], required: true } // [lng, lat]
    }
  },
  destination: {
    name: { type: String, required: true },
    location: {
      type: { type: String, default: 'Point' },
      coordinates: { type: [Number], required: true } // [lng, lat]
    }
  },
  schedule: {
    daysOfWeek: [{ type: Number, min: 0, max: 6, required: true }], // 0=Sun, 1=Mon, etc.
    targetDepartureTimeUtc: { type: String, required: true }, // "08:00"
    validFrom: { type: Date, required: true },
    validUntil: { type: Date }
  },
  seatsRequested: { 
    type: Number, 
    default: 1, 
    min: 1, 
    max: 4 
  },
  maxBudgetMad: { 
    type: Number 
  },
  preferredPaymentType: {
    type: String,
    enum: ['DIGITAL_ESCROW', 'CASH_ON_BOARDING'],
    default: 'DIGITAL_ESCROW'
  },
  status: { 
    type: String, 
    enum: ['ACTIVE', 'PAUSED', 'CANCELLED'], 
    default: 'ACTIVE',
    index: true 
  }
}, { 
  timestamps: true 
});

RecurringRideRequestSchema.index({ 'origin.location': '2dsphere' });
RecurringRideRequestSchema.index({ 'destination.location': '2dsphere' });

module.exports = mongoose.model('RecurringRideRequest', RecurringRideRequestSchema);
