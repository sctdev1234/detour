const mongoose = require('mongoose');
const { Schema } = mongoose;

const TaxSnapshotSchema = new Schema({
  grossFare: { type: Number, required: true },
  commissionRate: { type: Number, required: true },
  taxStrategy: { type: String, enum: ['VAT_INCLUSIVE', 'VAT_EXCLUSIVE', 'ZERO_RATED'], required: true },
  taxRate: { type: Number, required: true },
  commissionGrossAmount: { type: Number, required: true },
  taxableAmount: { type: Number, required: true },
  taxAmount: { type: Number, required: true },
  detourNetRevenue: { type: Number, required: true },
  driverGrossAmount: { type: Number, required: true },
  driverNetAmount: { type: Number, required: true },
  calculatedAt: { type: Date, default: Date.now, immutable: true }
}, { _id: false });

const FinancialJournalSchema = new Schema({
  referenceType: {
    type: String,
    enum: [
      'ESCROW_HOLD_DIGITAL',
      'ESCROW_HOLD_CASH_COMMISSION',
      'ESCROW_RELEASE_DIGITAL',
      'ESCROW_RELEASE_CASH_COMMISSION',
      'TRIP_SETTLEMENT',
      'CANCELLATION_PENALTY',
      'NO_SHOW_COMPENSATION',
      'DISPUTE_REFUND',
      'DISPUTE_PAYOUT',
      'EARNINGS_CLEARANCE',
      'WALLET_DEPOSIT',
      'WITHDRAWAL_REQUEST',
      'WITHDRAWAL_PAYOUT',
      'WITHDRAWAL_REVERSAL'
    ],
    required: true,
    index: true
  },
  referenceId: { type: Schema.Types.ObjectId, index: true }, // e.g., PassengerJourney ID, Withdrawal ID
  description: { type: String, required: true },
  currency: { type: String, default: 'MAD' },
  totalDebitCentimes: { type: Number, required: true },
  totalCreditCentimes: { type: Number, required: true },
  isBalanced: { type: Boolean, required: true, default: false },
  taxSnapshot: TaxSnapshotSchema,
  metadata: { type: Map, of: Schema.Types.Mixed }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

FinancialJournalSchema.pre('validate', function() {
  this.isBalanced = (this.totalDebitCentimes === this.totalCreditCentimes);
  if (!this.isBalanced) {
    throw new Error(`FinancialJournal is unbalanced: Debits (${this.totalDebitCentimes}) != Credits (${this.totalCreditCentimes})`);
  }
});

module.exports = mongoose.model('FinancialJournal', FinancialJournalSchema);
