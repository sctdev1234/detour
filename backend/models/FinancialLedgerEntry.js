const mongoose = require('mongoose');
const { Schema } = mongoose;

const FinancialLedgerEntrySchema = new Schema({
  journalId: { 
    type: Schema.Types.ObjectId, 
    ref: 'FinancialJournal', 
    required: true, 
    index: true 
  },
  accountId: { 
    type: String, 
    enum: [
      '1000_ASSET_PLATFORM_CASH',
      '2000_LIABILITY_CLIENT_WALLET',
      '2010_LIABILITY_ESCROW_DIGITAL',
      '2020_LIABILITY_ESCROW_CASH_COMMISSION',
      '2030_LIABILITY_DRIVER_PENDING',
      '2040_LIABILITY_DRIVER_AVAILABLE',
      '2050_LIABILITY_VAT_COLLECTED',
      '4000_REVENUE_PLATFORM_COMMISSION'
    ],
    required: true,
    index: true
  },
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    index: true 
  },
  type: { 
    type: String, 
    enum: ['DEBIT', 'CREDIT'], 
    required: true 
  },
  amountCentimes: { 
    type: Number, 
    required: true, 
    min: 1 
  },
  currency: { 
    type: String, 
    default: 'MAD' 
  },
  description: { 
    type: String 
  }
}, {
  timestamps: { createdAt: true, updatedAt: false }
});

FinancialLedgerEntrySchema.index({ accountId: 1, userId: 1, createdAt: 1 });

module.exports = mongoose.model('FinancialLedgerEntry', FinancialLedgerEntrySchema);
