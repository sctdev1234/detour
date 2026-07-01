const mongoose = require('mongoose');

const RideRequestSchema = new mongoose.Schema({
    passengerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    startPoint: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        },
        address: String
    },
    endPoint: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            required: true
        },
        address: String
    },
    status: {
        type: String,
        enum: ['DRAFT', 'SEARCHING', 'OFFERS_INCOMING', 'OFFER_SELECTED', 'ACCEPTED', 'FAILED', 'CANCELLED'],
        default: 'DRAFT'
    },
    pricingMetrics: {
        basePrice: { type: Number, required: true },
        serviceFee: { type: Number, required: true },
        estimatedDistance: { type: Number, required: true }, // in meters
        estimatedDuration: { type: Number, required: true } // in seconds
    },
    searchRadius: {
        type: Number,
        default: 3000 // Start with 3km
    },
    rideType: {
        type: String,
        enum: ['IMMEDIATE', 'SCHEDULED'],
        default: 'IMMEDIATE'
    },
    scheduledDeparture: {
        type: Date
    },
    expiresAt: {
        type: Date
    }
}, { timestamps: true });

// Geospatial index for radius searching
RideRequestSchema.index({ "startPoint": "2dsphere" });
// Index for fast status queries
RideRequestSchema.index({ status: 1 });

module.exports = mongoose.model('RideRequest', RideRequestSchema);
