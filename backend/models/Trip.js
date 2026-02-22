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
            enum: ['ROUTE_CREATED', 'WAITING_AT_PICKUP', 'PICKED_UP', 'DROPPED_OFF', 'CANCELLED'],
            default: 'ROUTE_CREATED'
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        }
    }],
    status: {
        type: String,
        enum: ['CREATED', 'PENDING', 'MATCHING', 'PARTIAL', 'FULL', 'CONFIRMED', 'STARTING', 'STARTED', 'PICKUP_IN_PROGRESS', 'IN_PROGRESS', 'DROPOFF_IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
        default: 'CREATED'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Trip', TripSchema);
