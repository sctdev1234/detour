const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
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
    price: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active'
    },
    // Optional: Track individual daily rides within this subscription trip
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Trip', TripSchema);
