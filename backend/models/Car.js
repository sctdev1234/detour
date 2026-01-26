const mongoose = require('mongoose');

const CarSchema = new mongoose.Schema({
    marque: { type: String, required: true },
    model: { type: String, required: true },
    year: { type: String, required: true },
    color: { type: String, required: true },
    places: { type: Number, default: 4 },
    isDefault: { type: Boolean, default: false },
    images: [String],
    documents: {
        registration: String,
        insurance: String,
        technicalVisit: String
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'unverified'],
        default: 'pending'
    },
    assignment: {
        driverEmail: String,
        profitSplit: Number,
        startDate: Date,
        status: {
            type: String,
            enum: ['active', 'pending', 'ended']
        }
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Car', CarSchema);
