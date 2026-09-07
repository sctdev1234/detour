const mongoose = require('mongoose');
const { Schema } = mongoose;

const DisputeRecordSchema = new Schema({
  passengerJourneyId: { 
    type: Schema.Types.ObjectId, 
    ref: 'PassengerJourney', 
    required: true, 
    index: true 
  },
  tripInstanceId: { 
    type: Schema.Types.ObjectId, 
    ref: 'TripInstance', 
    required: true, 
    index: true 
  },
  initiatedBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  disputeType: { 
    type: String, 
    enum: ['PICKUP_DISPUTED', 'DROPOFF_DISPUTED', 'ROUTE_DEVIATION', 'CONDUCT', 'FARE_DISAGREEMENT'], 
    required: true 
  },
  reason: { 
    type: String, 
    required: true 
  },
  evidence: [{
    type: { type: String, enum: ['IMAGE', 'TEXT', 'GPS_LOG', 'AUDIO'] },
    url: String,
    notes: String
  }],
  status: { 
    type: String, 
    enum: ['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED_REFUND', 'RESOLVED_PAYOUT', 'RESOLVED_SPLIT', 'DISMISSED'], 
    default: 'OPEN',
    index: true 
  },
  resolution: {
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,
    decisionNotes: String,
    refundAmountCentimes: Number,
    driverPayoutCentimes: Number,
    settlementJournalId: { type: Schema.Types.ObjectId, ref: 'FinancialJournal' }
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('DisputeRecord', DisputeRecordSchema);
