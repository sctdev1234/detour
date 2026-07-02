/**
 * ---------------------------------------------------------------------------------
 * MODEL: TripTemplate
 * ---------------------------------------------------------------------------------
 * Purpose: Defines the spatial intent (pickup, dropoff) and temporal rules
 *          (immediate, scheduled, recurring) for rides. Generates TripInstances.
 * Owner Domain: Trip Domain
 * Relationships: 
 *   - Parent of TripInstance (1:N)
 *   - Owned by Passenger
 * Lifecycle: Created by Passenger. Never physically deleted (softDelete/archive). 
 *            Transitions from ACTIVE -> PAUSED -> ARCHIVED.
 * State Machine: ACTIVE | PAUSED | ARCHIVED
 * Migration Notes: Old `Route` and `RideRequest` documents will be mapped here.
 * Future Extensions: Configurable for FLEET or SCHOOL scheduling strategies.
 * Deletion Strategy: Soft Delete (status = ARCHIVED). Retained indefinitely for legal/analytics.
 * Concurrency: Optimistic Concurrency enabled (__v).
 * Events Emitted: TripTemplateCreated, TripTemplatePaused, TripTemplateArchived.
 * Observability: 
 *   - Metrics: new_trip_template_count
 *   - Logs: info when status changes.
 * ---------------------------------------------------------------------------------
 */

const mongoose = require('mongoose');

const tripTemplateSchema = new mongoose.Schema(
    {
        schemaVersion: {
            type: Number,
            default: 1,
            required: true
        },
        creatorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true // Index: Optmizes finding all templates owned by a specific passenger.
        },
        creatorRole: {
            type: String,
            enum: ['passenger', 'driver', 'admin'],
            default: 'passenger',
            required: true
        },
        schedulingStrategy: {
            type: String,
            enum: ['IMMEDIATE', 'SCHEDULED', 'RECURRING'],
            required: true
        },
        startPoint: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true },
            address: { type: String, required: true }
        },
        endPoint: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], required: true },
            address: { type: String, required: true }
        },
        waypoints: [
            {
                type: { type: String, enum: ['Point'], default: 'Point' },
                coordinates: { type: [Number] },
                address: { type: String }
            }
        ],
        scheduleConfig: {
            cronExpression: { type: String }, // e.g., '0 8 * * 1-5'
            timezone: { type: String },       // e.g., 'Africa/Casablanca' to handle DST securely
            scheduledDates: [{ type: Date }], // For discrete non-recurring scheduled dates
            endDate: { type: Date }           // When the recurring logic naturally expires
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'PAUSED', 'ARCHIVED'],
            default: 'ACTIVE'
        },
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {} // Reserved for future extensions without requiring schema migrations
        },
        legacyReferenceId: {
            type: String,
            default: null // Preserves linking back to legacy Route/RideRequest documents during Strangler migration
        }
    },
    {
        timestamps: true,
        optimisticConcurrency: true // Prevents stale updates by enforcing version keys on save
    }
);

// Indexes
// Query optimized: Geo-spatial search around pickup. Read frequency: High for matching.
tripTemplateSchema.index({ 'startPoint': '2dsphere' });
// Query optimized: Background scheduler looking for templates to generate instances for. Read frequency: Medium (cron ticks).
tripTemplateSchema.index({ status: 1, schedulingStrategy: 1 });

module.exports = mongoose.model('TripTemplate', tripTemplateSchema);
