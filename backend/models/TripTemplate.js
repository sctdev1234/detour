const mongoose = require('mongoose');

const TripTemplateSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['driver', 'passenger'],
        required: true
    },
    carId: {
        type: String // Only applicable if role is driver
    },
    
    // Spatial Intent
    startPoint: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true }, // [longitude, latitude]
        address: String
    },
    endPoint: {
        type: { type: String, default: 'Point' },
        coordinates: { type: [Number], required: true }, // [longitude, latitude]
        address: String
    },
    waypoints: [{
        type: { type: String, default: 'Point' },
        coordinates: [Number],
        address: String
    }],
    routeGeometry: String, // Polyline
    
    distanceKm: Number,
    estimatedDurationMin: Number,

    // Pricing Intent
    pricing: {
        amount: Number,
        currency: { type: String, default: 'MAD' },
        type: { type: String, enum: ['fix', 'km'], default: 'fix' }
    },

    // Temporal Intent
    recurrenceType: {
        type: String,
        enum: ['IMMEDIATE', 'SCHEDULED', 'RECURRING'],
        required: true,
        default: 'IMMEDIATE'
    },
    scheduledDeparture: {
        type: Date // Used for 'SCHEDULED'
    },
    schedule: { // Used for 'RECURRING'
        days: [{ type: String, enum: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] }],
        time: String, // e.g., '08:30'
        timezone: { type: String, default: 'Africa/Casablanca' }
    },

    status: {
        type: String,
        enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'],
        default: 'ACTIVE'
    },
    
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Geospatial and compound indices
TripTemplateSchema.index({ 'startPoint': '2dsphere' });
TripTemplateSchema.index({ 'endPoint': '2dsphere' });
TripTemplateSchema.index({ role: 1, recurrenceType: 1, status: 1 });
TripTemplateSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('TripTemplate', TripTemplateSchema);
