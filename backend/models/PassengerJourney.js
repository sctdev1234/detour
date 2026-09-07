const mongoose = require('mongoose');
const { Schema } = mongoose;

const PassengerJourneySchema = new Schema({
  tripInstanceId: { 
    type: Schema.Types.ObjectId, 
    ref: 'TripInstance', 
    required: true, 
    index: true 
  },
  passengerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  pickupWaypointIndex: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  dropoffWaypointIndex: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  seatsBooked: { 
    type: Number, 
    required: true, 
    min: 1, 
    default: 1 
  },
  paymentType: { 
    type: String, 
    enum: ['DIGITAL_ESCROW', 'CASH_ON_BOARDING'], 
    required: true 
  },
  fareAmountMad: { 
    type: Number, 
    required: true, 
    min: 0 
  },
  escrowJournalId: { 
    type: Schema.Types.ObjectId, 
    ref: 'FinancialJournal' 
  },
  verificationOtp: { 
    type: String, 
    required: false 
  },
  otpConsumed: {
    type: Boolean,
    default: false
  },
  otpConsumedAt: {
    type: Date
  },
  status: { 
    type: String, 
    enum: [
      'BOOKED', 
      'DRIVER_ARRIVED', 
      'BOARDED', 
      'DROPPED_OFF', 
      'COMPLETED', 
      'CANCELLED_BY_CLIENT', 
      'CANCELLED_BY_DRIVER', 
      'NO_SHOW', 
      'DISPUTED'
    ], 
    default: 'BOOKED',
    index: true 
  },
  boardedAt: Date,
  droppedOffAt: Date,
  driverEarningsPendingAt: Date,
  earningsClearedAt: Date,
  ratingWindowExpiresAt: Date,
  disputeId: { 
    type: Schema.Types.ObjectId, 
    ref: 'DisputeRecord' 
  },
  taxSnapshot: {
    grossFare: Number,
    commissionRate: Number,
    taxStrategy: String,
    taxRate: Number,
    commissionGrossAmount: Number,
    taxableAmount: Number,
    taxAmount: Number,
    detourNetRevenue: Number,
    driverGrossAmount: Number,
    driverNetAmount: Number,
    calculatedAt: Date
  },
  _migrationMeta: {
    legacyType: String, // 'JoinRequest' | 'Route.clients'
    legacyId: Schema.Types.Mixed,
    migratedAt: Date
  }
}, { 
  timestamps: true 
});

PassengerJourneySchema.index({ tripInstanceId: 1, passengerId: 1 }, { unique: true });
PassengerJourneySchema.index({ status: 1, tripInstanceId: 1 });

module.exports = mongoose.model('PassengerJourney', PassengerJourneySchema);
