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
            enum: ['ROUTE_CREATED', 'WAITING', 'READY', 'PICKUP_INCOMING', 'IN_CAR', 'DROPPED_OFF', 'COMPLETED', 'CANCELLED', 'CANCELLED_AT_PICKUP', 'CANCELLED_AT_DROPOFF', 'PICKUP_DISPUTED', 'DROPOFF_DISPUTED'],
            default: 'WAITING'
        },
        driverRating: {
            type: Number,
            min: 1,
            max: 5
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'paid', 'failed'],
            default: 'pending'
        }
    }],
    status: {
        type: String,
        enum: [
            // Legacy / Scheduling States
            'CREATED', 'PENDING', 'MATCHING', 'PARTIAL', 'FULL', 'CONFIRMED', 
            // Execution States
            'STARTING_SOON', 'STARTED', 'PICKUP_IN_PROGRESS', 'IN_PROGRESS', 'DROPOFF_IN_PROGRESS', 
            'ARRIVED_PICKUP', 'CLIENT_PICKED_UP', 'CLIENT_DROPPED_OFF', 
            // New Granular States (dispatch fallback)
            'DRIVER_GOING', 'DRIVER_ARRIVED', 'PASSENGER_BOARDED', 'RIDE_STARTED', 'WAYPOINT_REACHED', 'DESTINATION_CHANGED', 'RIDE_COMPLETED', 'RECEIPT_PENDING', 'RATED', 'ARCHIVED',
            // Terminal States
            'COMPLETED', 'CANCELLED', 'active'
        ],
        default: 'CREATED'
    },
    driverReady: {
        type: Boolean,
        default: false
    },
    cancellationReason: {
        type: String
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    stateTimestamps: {
        startedAt: Date,
        completedAt: Date,
        cancelledAt: Date
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

TripSchema.index({ driverId: 1, status: 1 });
TripSchema.index({ 'clients.userId': 1, status: 1 });

module.exports = mongoose.model('Trip', TripSchema);
