/**
 * ---------------------------------------------------------------------------------
 * MODEL: Offer
 * ---------------------------------------------------------------------------------
 * Purpose: A complete negotiation object serving as a ledger of bids between 
 *          passengers and drivers.
 * Owner Domain: Dispatch Domain
 * Relationships: 
 *   - Belongs to TripInstance
 *   - Belongs to Driver
 *   - Belongs to Passenger
 * Lifecycle: Created by Dispatch/Matching Engine or Driver. Expires automatically.
 * State Machine: PENDING | COUNTER_OFFERED | ACCEPTED | REJECTED | EXPIRED | WITHDRAWN
 * Migration Notes: Old `Offer` objects map here directly.
 * Future Extensions: Fully supports AI auto-negotiation via negotiationHistory.
 * Deletion Strategy: Retained indefinitely for marketplace liquidity analytics.
 * Concurrency: Optimistic Concurrency enabled (__v). Critical for preventing
 *              stale acceptances.
 * Events Emitted: OfferCreated, OfferCountered, OfferAccepted, OfferRejected, OfferExpired.
 * Observability: 
 *   - Metrics: offer_acceptance_rate, average_bid_spread
 *   - Logs: debug on counter offers, info on acceptance.
 * ---------------------------------------------------------------------------------
 */

const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema(
    {
        schemaVersion: {
            type: Number,
            default: 1,
            required: true
        },
        tripInstanceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'TripInstance',
            required: false, // Relaxed for legacy backward compatibility (Phase 1-5)
            index: true
        },
        driverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        passengerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: false // Relaxed for legacy backward compatibility (Phase 1-5)
        },
        vehicleId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Vehicle',
            required: false // Relaxed for legacy backward compatibility (Phase 1-5)
        },
        price: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            default: 'MAD'
        },
        estimatedArrival: {
            type: Number, // In seconds
            required: false // Relaxed for legacy backward compatibility (Phase 1-5)
        },
        estimatedDuration: {
            type: Number, // In seconds
            required: false // Relaxed for legacy backward compatibility (Phase 1-5)
        },
        expiresAt: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['PENDING', 'COUNTER_OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN'],
            default: 'PENDING'
        },
        counterOfferHistory: [{
            issuerType: { type: String, enum: ['PASSENGER', 'DRIVER', 'SYSTEM'] },
            issuerId: { type: mongoose.Schema.Types.ObjectId },
            proposedPrice: { type: Number },
            proposedAt: { type: Date, default: Date.now }
        }],
        metadata: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: {}
        },
        legacyRideRequestId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'RideRequest',
            default: null // Temporarily retained for migration overlap
        }
    },
    {
        timestamps: true,
        optimisticConcurrency: true
    }
);

// Indexes
// Query optimized: Streaming active offers to a passenger. Read frequency: Very High.
offerSchema.index({ tripInstanceId: 1, status: 1 });
// Query optimized: Cleaning up driver dashboards / auto-expiring offers via cron. Read frequency: High.
offerSchema.index({ driverId: 1, expiresAt: 1 });

module.exports = mongoose.model('Offer', offerSchema);
