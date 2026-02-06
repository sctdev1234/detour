const mongoose = require('mongoose');

const DriverRouteSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // In Phase 1, we might just track their availability. 
    // In future, this could store the actual polyline or waypoints.
    schedule: {
        days: [{ type: String }], // e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        time: { type: String, required: true } // e.g. '08:30'
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

module.exports = mongoose.model('DriverRoute', DriverRouteSchema);
