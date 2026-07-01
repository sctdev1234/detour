const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
    rideRequestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RideRequest',
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    proposedPrice: {
        type: Number,
        required: true
    },
    etaMinutes: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'],
        default: 'PENDING'
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 60000) // Default 60 seconds TTL
    }
}, { timestamps: true });

// TTL index to auto-expire offers after 60 seconds
OfferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Offer', OfferSchema);
