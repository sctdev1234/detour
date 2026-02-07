const mongoose = require('mongoose');

const DriverRouteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    carId: {
        type: String
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

    // Flexible schedule or specific trip
    schedule: {
        days: [{ type: String }], // e.g. ['Mon', 'Tue']
        time: { type: String },    // Departure time e.g. '08:30'
        timeArrival: { type: String } // Arrival time e.g. '09:30'
    },

    distanceKm: Number,
    estimatedDurationMin: Number,

    price: {
        amount: Number,
        type: { type: String, enum: ['fix', 'km'], default: 'fix' }
    },

    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

DriverRouteSchema.index({ "startPoint.coordinates": "2dsphere" });
DriverRouteSchema.index({ "endPoint.coordinates": "2dsphere" });

module.exports = mongoose.model('DriverRoute', DriverRouteSchema);
