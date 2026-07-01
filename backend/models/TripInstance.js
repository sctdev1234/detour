const mongoose = require('mongoose');

const TripInstanceSchema = new mongoose.Schema({
    templateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TripTemplate',
        required: true
    },
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

    // Executable Time (Concrete timestamp)
    departureTime: {
        type: Date,
        required: true
    },

    // Snapshot of Spatial Intent (in case template changes mid-flight)
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
    distanceKm: Number,
    estimatedDurationMin: Number,
    
    // Pricing Snapshot
    pricing: {
        basePrice: { type: Number, required: true },
        serviceFee: { type: Number, required: true }
    },

    // Passenger specifics
    seatsRequested: { type: Number, default: 1 },

    // Driver specifics
    carId: { type: String },
    seatsAvailable: { type: Number },

    // Status State Machine
    status: {
        type: String,
        enum: [
            // Setup
            'DRAFT',
            // Matchmaking (Passenger)
            'SEARCHING', 'OFFERS_OPEN', 'OFFER_ACCEPTED', 'DRIVER_ASSIGNED',
            // Matchmaking (Driver scheduled)
            'PUBLISHED',
            // Execution Lifecycle (For Passenger instances matching Driver Execution)
            'DRIVER_EN_ROUTE', 'DRIVER_ARRIVED', 'PASSENGER_BOARDED', 'TRIP_STARTED',
            'WAYPOINT_REACHED', 'DESTINATION_UPDATED',
            // Termination
            'TRIP_COMPLETED', 'PAYMENT_PENDING', 'PAYMENT_COMPLETED', 'RATED',
            'ARCHIVED', 'CANCELLED_BY_PASSENGER', 'CANCELLED_BY_DRIVER', 'CANCELLED_BY_SYSTEM'
        ],
        default: 'DRAFT'
    },
    
    // Execution Link
    executionTripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    },
    
    // Constraints
    searchRadius: {
        type: Number,
        default: 3000 // Initial 3km
    },

    stateTimestamps: {
        draftedAt: Date,
        searchingAt: Date,
        driverAssignedAt: Date,
        completedAt: Date,
        cancelledAt: Date
    },
    
    cancellationReason: String
}, { timestamps: true });

// Geospatial indexing
TripInstanceSchema.index({ 'startPoint': '2dsphere' });
TripInstanceSchema.index({ 'endPoint': '2dsphere' });

// Lifecycle and querying indexes
TripInstanceSchema.index({ role: 1, status: 1 });
TripInstanceSchema.index({ departureTime: 1 });
TripInstanceSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('TripInstance', TripInstanceSchema);
