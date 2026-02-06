const mongoose = require('mongoose');

const RideRequestSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    pickup: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String, required: true }
    },
    destination: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String, required: true }
    },
    // Schedule: Which days and what time?
    schedule: {
        days: [{ type: String }], // e.g. ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        time: { type: String, required: true } // e.g. '08:30'
    },
    status: {
        type: String,
        enum: ['pending', 'matched', 'completed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('RideRequest', RideRequestSchema);
