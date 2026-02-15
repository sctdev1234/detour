const mongoose = require('mongoose');

const TripSchema = new mongoose.Schema({
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route', // The Driver's Route
        required: true
    },
    clients: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        routeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Route' // The Client's Route
        },
        price: {
            type: Number,
            required: true
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        status: {
            type: String,
            enum: ['pending', 'picked_up', 'dropped_off', 'cancelled'],
            default: 'pending'
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        }
    }],
    status: {
        type: String,
        enum: ['pending', 'active', 'completed', 'cancelled'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Trip', TripSchema);
