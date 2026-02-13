const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    type: {
        type: String,
        enum: ['credit', 'debit'], // credit = money added to user, debit = money removed
        required: true
    },
    category: {
        type: String,
        enum: ['payment', 'commission', 'refund', 'deposit', 'withdrawal'],
        required: true
    },
    relatedUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    },
    description: String,
    status: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'completed'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
