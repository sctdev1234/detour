const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    role: {
        type: String,
        enum: ['driver', 'client'],
        required: true
    },
    carId: {
        type: String // Only for drivers
    },
    startPoint: {
        type: { type: String, default: 'Point' },
        coordinates: [Number], // [longitude, latitude]
        address: String
    },
    endPoint: {
        type: { type: String, default: 'Point' },
        coordinates: [Number], // [longitude, latitude]
        address: String
    },
    waypoints: [{
        type: { type: String, default: 'Point' },
        coordinates: [Number],
        address: String
    }],
    routeGeometry: String, // Polyline string

    schedule: {
        days: [{ type: String }], // e.g. ['Mon', 'Tue']
        time: { type: String },    // Departure time e.g. '08:30'
        timeArrival: { type: String } // Only for drivers / whole trajet
    },

    distanceKm: Number,
    estimatedDurationMin: Number,

    price: {
        amount: Number,
        type: { type: String, enum: ['fix', 'km'], default: 'fix' }
    },

    status: {
        type: String,
        enum: ['pending', 'active', 'inactive'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

RouteSchema.index({ "startPoint.coordinates": "2dsphere" });
RouteSchema.index({ "endPoint.coordinates": "2dsphere" });

module.exports = mongoose.model('Route', RouteSchema);
