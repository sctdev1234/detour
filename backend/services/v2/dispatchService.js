/**
 * ---------------------------------------------------------------------------------
 * SERVICE: DispatchService (V2)
 * ---------------------------------------------------------------------------------
 * Purpose: Pure orchestrator executing the strict Dispatch Pipeline.
 *          Delegates logic to dedicated stage services.
 * Owner Domain: Dispatch Domain
 * ---------------------------------------------------------------------------------
 */

const mongoose = require('mongoose');
const TripInstance = require('../../models/TripInstance');
const Offer = require('../../models/Offer');
const TripAssignment = require('../../models/TripAssignment');
const TripStateMachine = require('../../state/TripStateMachine');
const OfferStateMachine = require('../../state/OfferStateMachine');
const DomainEventBus = require('../../events/DomainEventBus');
const Metrics = require('../../utils/metrics');

const DiscoveryService = require('./pipeline/DiscoveryService');
const EligibilityService = require('./pipeline/EligibilityService');
const DistanceService = require('./pipeline/DistanceService');
const ScoringService = require('./pipeline/ScoringService');

class DispatchServiceV2 {
    
    /**
     * Executes the Matching Pipeline for a specific TripInstance
     * @param {Object} tripInstance 
     */
    static async executeMatchingPipeline(tripInstance) {
        const startTime = Date.now();
        const session = await mongoose.startSession();
        session.startTransaction();
        const pendingEvents = [];

        try {
            // Stage 1: Discovery
            const rawCandidates = await DiscoveryService.discoverCandidates(tripInstance, 5000);
            
            // Stage 2: Eligibility
            const eligibleCandidates = EligibilityService.filterEligible(rawCandidates);
            
            // Stage 3: Distance & ETA
            const evaluatedCandidates = DistanceService.calculateETAs(eligibleCandidates, tripInstance.pickup);
            
            // Stage 4: Scoring & Ranking
            const topCandidates = ScoringService.scoreAndRank(evaluatedCandidates, 5);
            
            if (topCandidates.length === 0) {
                console.log(`[DispatchPipeline] No candidates found for instance ${tripInstance._id}`);
                await session.abortTransaction();
                return;
            }

            // Stage 5: Offer Generation
            let generatedCount = 0;
            for (const candidate of topCandidates) {
                const offer = new Offer({
                    tripInstanceId: tripInstance._id,
                    driverId: candidate.driverId,
                    passengerId: tripInstance.passengerIds[0],
                    vehicleId: candidate.vehicleId || new mongoose.Types.ObjectId(), // Stub
                    price: tripInstance.pricingSnapshot ? tripInstance.pricingSnapshot.baseFare : 10,
                    estimatedArrival: candidate.etaSeconds,
                    estimatedDuration: 900,
                    expiresAt: new Date(Date.now() + 60000), // 60 seconds
                    status: OfferStateMachine.STATES.PENDING
                });
                await offer.save({ session });
                
                // Outbox pattern: Queue event to fire strictly post-commit
                pendingEvents.push({ type: 'OfferCreated', id: offer._id, payload: offer });
                generatedCount++;
            }

            // Mutate Instance state
            TripStateMachine.validateTransition(tripInstance.status, TripStateMachine.STATES.OFFERS_OPEN);
            tripInstance.status = TripStateMachine.STATES.OFFERS_OPEN;
            tripInstance.stateTimestamps.offersOpenAt = new Date();
            await tripInstance.save({ session });
            
            await session.commitTransaction();

            // Post-commit publish
            pendingEvents.forEach(evt => DomainEventBus.publish(evt.type, evt.id, evt.payload));
            
            // Metrics
            Metrics.timing('matching_duration_ms', Date.now() - startTime);
            Metrics.count('offers_generated', generatedCount);

        } catch (error) {
            await session.abortTransaction();
            console.error(`[DispatchPipeline] Failed for instance ${tripInstance._id}:`, error);
            Metrics.count('matching_failure');
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Handles Offer Acceptance using MongoDB Transactions to prevent race conditions
     * and enforce idempotency.
     * @param {string} offerId 
     * @returns {Object} TripAssignment
     */
    static async acceptOffer(offerId) {
        const startTime = Date.now();
        const session = await mongoose.startSession();
        session.startTransaction();
        const pendingEvents = [];

        try {
            const offer = await Offer.findById(offerId).session(session);
            if (!offer) throw new Error('Offer not found');

            // IDEMPOTENCY GUARD
            if (offer.status === OfferStateMachine.STATES.ACCEPTED) {
                // Already accepted, just return the existing assignment
                const existingAssignment = await TripAssignment.findOne({ tripInstanceId: offer.tripInstanceId }).session(session);
                await session.commitTransaction();
                return existingAssignment;
            }

            OfferStateMachine.validateTransition(offer.status, OfferStateMachine.STATES.ACCEPTED);

            const tripInstance = await TripInstance.findById(offer.tripInstanceId).session(session);
            TripStateMachine.validateTransition(tripInstance.status, TripStateMachine.STATES.ASSIGNED);

            // Create Lightweight TripAssignment
            const assignment = new TripAssignment({
                tripInstanceId: tripInstance._id,
                driverId: offer.driverId,
                vehicleId: offer.vehicleId || new mongoose.Types.ObjectId() // Stub
            });
            await assignment.save({ session });

            // Mutate Instance
            tripInstance.status = TripStateMachine.STATES.ASSIGNED;
            tripInstance.assignmentId = assignment._id;
            tripInstance.stateTimestamps.assignedAt = new Date();
            await tripInstance.save({ session });

            // Mutate Offer
            offer.status = OfferStateMachine.STATES.ACCEPTED;
            await offer.save({ session });

            // Reject competing offers
            await Offer.updateMany(
                { tripInstanceId: tripInstance._id, _id: { $ne: offer._id } },
                { $set: { status: OfferStateMachine.STATES.REJECTED } }
            ).session(session);

            // Queue Event post-commit
            pendingEvents.push({ type: 'TripAssigned', id: assignment._id, payload: assignment });

            await session.commitTransaction();
            
            // Publish Event
            pendingEvents.forEach(evt => DomainEventBus.publish(evt.type, evt.id, evt.payload));

            Metrics.timing('acceptance_duration_ms', Date.now() - startTime);
            Metrics.count('assignment_success');

            return assignment;
        } catch (error) {
            await session.abortTransaction();
            Metrics.count('assignment_failure');
            throw error;
        } finally {
            session.endSession();
        }
    }
}

module.exports = DispatchServiceV2;
