/**
 * ---------------------------------------------------------------------------------
 * MODEL: TripAssignment
 * ---------------------------------------------------------------------------------
 * Purpose: A lightweight junction model owning the relationship between driver, 
 *          vehicle, and execution instance.
 * Owner Domain: Trip Domain
 * Relationships: 
 *   - Belongs to TripInstance (1:1 per assignment)
 *   - Belongs to Driver
 *   - Belongs to Vehicle
 * Lifecycle: Created strictly upon Offer Acceptance by Dispatch Engine.
 * State Machine: ACTIVE | COMPLETED | CANCELLED | REASSIGNED
 * Migration Notes: Extracted from embedded driver/vehicle fields inside legacy Trip.
 * Future Extensions: Easily supports multi-driver relays without modifying TripInstance.
 * Deletion Strategy: Retained indefinitely for legal/analytics.
 * Concurrency: Optimistic Concurrency enabled (__v).
 * Events Emitted: TripAssigned, TripUnassigned.
 * Observability: 
 *   - Metrics: trip_assignment_count, trip_assignment_failure_count
 *   - Logs: info when assignment is bound.
 * ---------------------------------------------------------------------------------
 */

const mongoose = require('mongoose');

const tripAssignmentSchema = new mongoose.Schema(
    {
        schemaVersion: {
            type: Number,
            default: 1,
            required: true
        },
        tripInstanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TripInstance',
            required: true,
            unique: true // Guarantees 1 active assignment per instance
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Assuming Drivers are a subset of User
            required: true
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle', // Assumes a future Vehicle collection exists
            required: false // Made optional for V1->V2 migration
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'COMPLETED', 'CANCELLED', 'REASSIGNED'],
            default: 'ACTIVE'
        },
        assignedAt: {
            type: Date,
            default: Date.now,
            required: true
        },
        completedAt: {
            type: Date,
            default: null
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    {
        timestamps: true,
        optimisticConcurrency: true
    }
);

// Indexes
// Query optimized: Checking if a driver is currently assigned/busy. Read frequency: High.
tripAssignmentSchema.index({ driverId: 1, status: 1 });

module.exports = mongoose.model('TripAssignment', tripAssignmentSchema);
