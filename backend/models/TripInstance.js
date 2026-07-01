/**
 * ---------------------------------------------------------------------------------
 * MODEL: TripInstance
 * ---------------------------------------------------------------------------------
 * Purpose: A discrete ride execution occurrence. The heart of the platform.
 * Owner Domain: Trip Domain
 * Relationships: 
 *   - Belongs to TripTemplate
 *   - Has 1 TripAssignment
 *   - Has many Offers
 * Lifecycle: State machine transitions strictly enforced. Contains immutable 
 *            pricing snapshots upon OFFERS_OPEN.
 * State Machine: DRAFT -> SEARCHING -> OFFERS_OPEN -> ASSIGNED -> EN_ROUTE -> 
 *                ARRIVED -> BOARDED -> STARTED -> COMPLETED | CANCELLED
 * Migration Notes: Legacy `Trip` logic maps here.
 * Future Extensions: Configurable metadata for specific vehicle requirements.
 * Deletion Strategy: Retained indefinitely for legal/analytics. Soft delete only 
 *                    if strictly necessary via status = CANCELLED.
 * Concurrency: Optimistic Concurrency enabled (__v).
 * Events Emitted: TripInstanceCreated, TripSearching, TripCompleted, TripCancelled.
 * Observability: 
 *   - Metrics: trip_status_transition
 *   - Logs: info when status changes, warning on unassigned timeout.
 * ---------------------------------------------------------------------------------
 */

const mongoose = require('mongoose');

const tripInstanceSchema = new mongoose.Schema(
    {
        schemaVersion: {
            type: Number,
            default: 1,
            required: true
        },
        templateId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TripTemplate',
            required: true,
            index: true
        },
        assignmentId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TripAssignment',
            default: null
        },
        passengerIds: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }],
        pickup: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true },
            address: { type: String, required: true }
        },
        destination: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true },
            address: { type: String, required: true }
        },
        waypoints: [{
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number] },
            address: { type: String }
        }],
        scheduledTime: {
            type: Date,
            required: true
        },
        seatCapacity: {
            type: Number,
            default: 4
        },
        reservedSeats: {
            type: Number,
            default: 1,
            required: true
        },
        status: {
            type: String,
            enum: [
                'DRAFT', 'SEARCHING', 'OFFERS_OPEN', 'ASSIGNED', 
                'EN_ROUTE', 'ARRIVED', 'BOARDED', 'STARTED', 
                'COMPLETED', 'CANCELLED'
            ],
            default: 'DRAFT'
        },
        pricingSnapshot: {
            baseFare: { type: Number },
            distanceFare: { type: Number },
            timeFare: { type: Number },
            commission: { type: Number },
            taxes: { type: Number },
            currency: { type: String, default: 'MAD' },
            pricingVersion: { type: String }
        },
        stateTimestamps: {
            draftAt: { type: Date },
            searchingAt: { type: Date },
            offersOpenAt: { type: Date },
            assignedAt: { type: Date },
            enRouteAt: { type: Date },
            arrivedAt: { type: Date },
            boardedAt: { type: Date },
            startedAt: { type: Date },
            completedAt: { type: Date },
            cancelledAt: { type: Date }
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {}
        },
        legacyReferenceId: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true,
        optimisticConcurrency: true // Protects status transitions and assignment locks
    }
);

// Indexes
// Query optimized: Scheduled cron jobs searching for instances to activate. Read frequency: Medium.
tripInstanceSchema.index({ status: 1, scheduledTime: 1 });
// Query optimized: Dispatch Matching Engine finding nearby pending requests. Read frequency: High.
tripInstanceSchema.index({ 'pickup': '2dsphere' });
// Query optimized: Passenger fetching their ride history. Read frequency: High.
tripInstanceSchema.index({ passengerIds: 1 });

module.exports = mongoose.model('TripInstance', tripInstanceSchema);
