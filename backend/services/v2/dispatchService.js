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
const crypto = require('crypto');
const TripInstance = require('../../models/TripInstance');
const Offer = require('../../models/Offer');
const TripAssignment = require('../../models/TripAssignment');
const PassengerJourney = require('../../models/PassengerJourney');
const User = require('../../models/User');
const TripStateMachine = require('../../state/TripStateMachine');
const OfferStateMachine = require('../../state/OfferStateMachine');
const DomainEventBus = require('../../events/DomainEventBus');
const Metrics = require('../../utils/metrics');
const capacityService = require('../capacityService');
const escrowService = require('../escrowService');

const Route = require('../../models/Route');
const Trip = require('../../models/Trip');
const driverEligibilityService = require('../driverEligibilityService');
const { isRouteCompatible } = require('../../utils/corridorMatcher');
const NotificationService = require('../notificationService');

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
            const baseFare = (tripInstance.pricingSnapshot && tripInstance.pricingSnapshot.baseFare) 
                ? tripInstance.pricingSnapshot.baseFare 
                : (tripInstance.metadata?.price || 15);

            const clientRouteId = tripInstance.metadata?.clientRouteId 
                || (tripInstance.metadata?.get && tripInstance.metadata.get('clientRouteId'))
                || null;

            for (const candidate of topCandidates) {
                const offer = new Offer({
                    tripInstanceId: tripInstance._id,
                    driverId: candidate.driverId,
                    passengerId: tripInstance.passengerIds[0],
                    vehicleId: candidate.vehicleId || new mongoose.Types.ObjectId(), // Stub
                    price: baseFare,
                    estimatedArrival: candidate.etaSeconds,
                    estimatedDuration: 900,
                    expiresAt: new Date(Date.now() + 300000), // 5 minutes
                    status: OfferStateMachine.STATES.PENDING,
                    metadata: {
                        clientRouteId,
                        price: baseFare,
                        pickup: tripInstance.pickup,
                        destination: tripInstance.destination
                    }
                });
                await offer.save({ session });
                
                // Outbox pattern: Queue event to fire strictly post-commit
                pendingEvents.push({
                    type: 'OfferCreated',
                    id: offer._id,
                    payload: {
                        ...offer.toJSON(),
                        price: baseFare,
                        pickup: tripInstance.pickup,
                        destination: tripInstance.destination,
                        clientRouteId,
                        metadata: {
                            clientRouteId,
                            price: baseFare
                        }
                    }
                });
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
            console.error(`[DispatchPipeline] Failed for instance ${tripInstance._id}:`, error);
            try { await session.abortTransaction(); } catch (e) { /* ignore */ }
            Metrics.count('matching_failure');
            throw error;
        } finally {
            session.endSession();
        }
    }

    /**
     * Handles Offer Acceptance delegating to the canonical OfferAcceptanceEngine.
     * @param {string} offerId 
     * @param {string} [passengerUserId]
     * @returns {Object} TripAssignment
     */
    static async acceptOffer(offerId, passengerUserId) {
        const OfferAcceptanceEngine = require('../offerAcceptanceEngine');
        return await OfferAcceptanceEngine.acceptOfferAtomic(offerId, passengerUserId);
    }

    /**
     * Driver invites a passenger by creating a canonical DRIVER_PROPOSED Offer.
     * Enforces the 10 server-side security checks.
     * Does NOT assign the trip (Offer != Assignment).
     * Does NOT create TripAssignment or PassengerJourney.
     * Does NOT hold escrow or generate OTP.
     * 
     * @param {string} driverId
     * @param {Object} params
     * @param {string} [params.clientRouteId]
     * @param {string} [params.tripInstanceId]
     * @param {string} [params.driverRouteId]
     * @param {string} [params.tripId]
     * @param {string} [params.passengerId]
     * @param {number} [params.proposedPrice]
     * @returns {Promise<Object>} Created Offer
     */
    static async invitePassenger(driverId, params = {}) {
        // 1. Authenticated driver validation
        if (!driverId) {
            const err = new Error('Authenticated driver required');
            err.statusCode = 401;
            throw err;
        }
        const driverUser = await User.findById(driverId);
        if (!driverUser) {
            const err = new Error('Driver not found');
            err.statusCode = 404;
            throw err;
        }

        // 2. Driver is online & eligible
        if (driverUser.driverStatus !== 'ONLINE') {
            const err = new Error('Driver must be ONLINE to invite passengers');
            err.statusCode = 403;
            throw err;
        }
        const eligibility = await driverEligibilityService.checkEligibility(driverId);
        if (!eligibility.isEligible) {
            const err = new Error(`Driver not eligible: ${eligibility.reason || 'failed eligibility checks'}`);
            err.statusCode = 403;
            throw err;
        }

        // 3. Driver owns the relevant route
        let driverRoute = null;
        if (params.driverRouteId) {
            driverRoute = await Route.findById(params.driverRouteId);
        }
        if (!driverRoute && params.tripId) {
            const tripDoc = await Trip.findById(params.tripId);
            if (tripDoc && tripDoc.routeId) {
                driverRoute = await Route.findById(tripDoc.routeId);
            }
        }
        if (!driverRoute) {
            driverRoute = await Route.findOne({ userId: driverId, role: 'driver', status: 'active' });
        }
        if (!driverRoute) {
            const err = new Error('Driver route not found');
            err.statusCode = 404;
            throw err;
        }
        if (driverRoute.userId.toString() !== driverId.toString()) {
            const err = new Error('Unauthorized: driver does not own this route');
            err.statusCode = 403;
            throw err;
        }

        // 4. Passenger exists
        let passengerCandidate = null;
        let passengerRoute = null;
        let passengerInstance = null;
        let passengerId = null;

        const targetId = params.clientRouteId || params.tripInstanceId;
        if (targetId) {
            passengerRoute = await Route.findById(targetId);
            if (!passengerRoute) {
                passengerInstance = await TripInstance.findById(targetId);
            }
        }

        if (passengerRoute) {
            passengerCandidate = passengerRoute;
            passengerId = passengerRoute.userId?._id ? passengerRoute.userId._id.toString() : passengerRoute.userId?.toString();
        } else if (passengerInstance) {
            passengerCandidate = {
                _id: passengerInstance._id,
                role: 'client',
                startPoint: passengerInstance.pickup,
                endPoint: passengerInstance.destination,
                schedule: passengerInstance.schedule,
                scheduledDeparture: passengerInstance.scheduledDeparture,
                scheduledTime: passengerInstance.scheduledTime,
                expiresAt: passengerInstance.expiresAt,
                status: passengerInstance.status,
                price: passengerInstance.pricingSnapshot?.baseFare ? { amount: passengerInstance.pricingSnapshot.baseFare } : undefined
            };
            passengerId = passengerInstance.passengerIds?.[0]?._id 
                ? passengerInstance.passengerIds[0]._id.toString() 
                : passengerInstance.passengerIds?.[0]?.toString();
        }

        if (!passengerId && params.passengerId) {
            passengerId = params.passengerId;
        }

        if (!passengerId || !passengerCandidate) {
            const err = new Error('Passenger request not found');
            err.statusCode = 404;
            throw err;
        }

        const passengerUser = await User.findById(passengerId);
        if (!passengerUser) {
            const err = new Error('Passenger not found');
            err.statusCode = 404;
            throw err;
        }

        // 5. Passenger is actually a valid match (server-side verification, never trust frontend)
        const isScheduleCompatible = (dRoute, pReq) => {
            if (pReq.expiresAt && new Date() > new Date(pReq.expiresAt)) return false;
            if (pReq.status === 'CANCELLED' || pReq.isDeleted === true) return false;
            const driverTime = dRoute.schedule?.time;
            const passTime = pReq.schedule?.time;
            if (driverTime && passTime) {
                const [dh, dm] = driverTime.split(':').map(Number);
                const [ph, pm] = passTime.split(':').map(Number);
                if (!isNaN(dh) && !isNaN(ph)) {
                    const diffMin = Math.abs((dh * 60 + dm) - (ph * 60 + pm));
                    if (diffMin > 120) return false;
                }
            }
            const driverDate = dRoute.date || dRoute.scheduledTime;
            const passDate = pReq.scheduledDeparture || pReq.scheduledTime;
            if (driverDate && passDate) {
                const diffHours = Math.abs(new Date(driverDate).getTime() - new Date(passDate).getTime()) / 3600000;
                if (diffHours > 2) return false;
            }
            return true;
        };

        if (!isScheduleCompatible(driverRoute, passengerCandidate)) {
            const err = new Error('Schedule incompatible between driver and passenger');
            err.statusCode = 400;
            throw err;
        }

        const matchResult = isRouteCompatible(driverRoute, passengerCandidate, { maxCorridorMeters: 25000 });
        if (!matchResult.matched) {
            const err = new Error('Passenger is not an authoritative corridor match (max 25km corridor)');
            err.statusCode = 400;
            throw err;
        }

        // 6. Offer is not expired (passenger request not expired)
        if (passengerCandidate.expiresAt && new Date() > new Date(passengerCandidate.expiresAt)) {
            const err = new Error('Passenger request has expired');
            err.statusCode = 400;
            throw err;
        }

        // 7. Trip is still open
        const tripDoc = params.tripId 
            ? await Trip.findById(params.tripId) 
            : await Trip.findOne({ routeId: driverRoute._id, status: { $ne: 'completed' } });
        if (tripDoc) {
            if (['completed', 'cancelled'].includes(tripDoc.status?.toLowerCase())) {
                const err = new Error('Driver trip is closed or cancelled');
                err.statusCode = 400;
                throw err;
            }
            if (tripDoc.seatsAvailable !== undefined && tripDoc.seatsAvailable <= 0) {
                const err = new Error('No seats available on driver trip');
                err.statusCode = 400;
                throw err;
            }
        }
        if (passengerRoute && ['cancelled', 'completed'].includes(passengerRoute.status?.toLowerCase())) {
            const err = new Error('Passenger request is cancelled or closed');
            err.statusCode = 400;
            throw err;
        }
        if (passengerInstance && ['CANCELLED', 'COMPLETED'].includes(passengerInstance.status)) {
            const err = new Error('Passenger trip instance is cancelled or closed');
            err.statusCode = 400;
            throw err;
        }

        // 8. Driver is not already assigned to another active trip
        await driverEligibilityService.assertSingleActiveTrip(driverId);
        const activeDriverAssignment = await TripAssignment.findOne({ driverId, status: 'ACTIVE' });
        if (activeDriverAssignment) {
            const err = new Error('Driver is already assigned to an active trip');
            err.statusCode = 409;
            throw err;
        }

        // 9. Passenger is not already assigned
        if (passengerInstance && passengerInstance.status === 'ASSIGNED') {
            const err = new Error('Passenger is already assigned');
            err.statusCode = 409;
            throw err;
        }
        if (passengerInstance) {
            const activePassengerAssignment = await TripAssignment.findOne({ tripInstanceId: passengerInstance._id, status: 'ACTIVE' });
            if (activePassengerAssignment) {
                const err = new Error('Passenger is already assigned to an active trip');
                err.statusCode = 409;
                throw err;
            }
        }
        const activeJourney = await PassengerJourney.findOne({ passengerId, status: { $in: ['BOOKED', 'EN_ROUTE', 'BOARDED'] } });
        if (activeJourney) {
            const err = new Error('Passenger already has an active ongoing trip');
            err.statusCode = 409;
            throw err;
        }

        // 10. Check if open offer already exists for this route/passenger
        let existingOpenOffer = await Offer.findOne({
            driverId,
            $or: [
                { 'metadata.clientRouteId': passengerCandidate._id.toString() },
                { 'metadata.clientRouteId': passengerCandidate._id },
                { passengerId, 'metadata.driverRouteId': driverRoute._id }
            ],
            status: { $in: ['PENDING', 'DRIVER_PROPOSED', 'COUNTER_OFFERED', 'COUNTERED'] },
            expiresAt: { $gt: new Date() }
        });

        // Canonical V2 TripInstance resolution for passenger
        if (!passengerInstance) {
            passengerInstance = await TripInstance.findOne({
                passengerIds: passengerId,
                status: { $in: ['SEARCHING', 'OFFERS_OPEN'] }
            }).sort({ createdAt: -1 });

            if (!passengerInstance) {
                const pickupCoords = passengerCandidate.startPoint?.coordinates || [-7.3829, 33.6861];
                const destCoords = passengerCandidate.endPoint?.coordinates || [-7.1594, 33.7894];
                passengerInstance = new TripInstance({
                    templateId: new mongoose.Types.ObjectId(),
                    scheduledTime: new Date(),
                    passengerIds: [passengerId],
                    pickup: {
                        type: 'Point',
                        coordinates: pickupCoords,
                        address: passengerCandidate.startPoint?.address || 'Pickup'
                    },
                    destination: {
                        type: 'Point',
                        coordinates: destCoords,
                        address: passengerCandidate.endPoint?.address || 'Destination'
                    },
                    status: 'OFFERS_OPEN',
                    pricingSnapshot: {
                        baseFare: params.proposedPrice || passengerCandidate.price?.amount || 15,
                        currency: 'MAD'
                    },
                    stateTimestamps: {
                        searchingAt: new Date(),
                        offersOpenAt: new Date()
                    }
                });
                await passengerInstance.save();
            } else if (passengerInstance.status === 'SEARCHING') {
                passengerInstance.status = 'OFFERS_OPEN';
                passengerInstance.stateTimestamps = passengerInstance.stateTimestamps || {};
                passengerInstance.stateTimestamps.offersOpenAt = new Date();
                await passengerInstance.save();
            }
        }

        const fare = params.proposedPrice || (passengerCandidate.price?.amount || passengerCandidate.price || 15);
        const expiresAt = new Date(Date.now() + 120000); // 2 minutes

        let offer;
        if (existingOpenOffer) {
            const hasNewPrice = params.proposedPrice !== undefined && Number(params.proposedPrice) !== Number(existingOpenOffer.price);
            if (params.isEdit || hasNewPrice) {
                // Edit existing offer in-place (single proposal rule)
                const fare = params.proposedPrice !== undefined ? Number(params.proposedPrice) : existingOpenOffer.price;
                existingOpenOffer.price = fare;
                existingOpenOffer.counterPrice = fare;
                existingOpenOffer.expiresAt = expiresAt;
                existingOpenOffer.respondedAt = new Date();
                if (existingOpenOffer.metadata) {
                    if (existingOpenOffer.metadata.set) {
                        existingOpenOffer.metadata.set('price', fare);
                    } else {
                        existingOpenOffer.metadata.price = fare;
                    }
                }
                await existingOpenOffer.save();
                offer = existingOpenOffer;
            } else {
                const err = new Error('Duplicate open offer already exists for this passenger');
                err.statusCode = 409;
                throw err;
            }
        } else {
            // Create Offer with status DRIVER_PROPOSED
            offer = new Offer({
                tripInstanceId: passengerInstance._id,
                driverId,
                passengerId,
                vehicleId: driverUser.vehicleId || null,
                price: fare,
                currency: 'MAD',
                expiresAt,
                status: 'DRIVER_PROPOSED',
                metadata: {
                    driverRouteId: driverRoute._id,
                    clientRouteId: passengerCandidate._id,
                    tripId: tripDoc?._id || null,
                    pickup: passengerCandidate.startPoint || passengerCandidate.pickup,
                    destination: passengerCandidate.endPoint || passengerCandidate.destination,
                    pickupDistanceMeters: matchResult.pickupDistanceMeters,
                    dropoffDistanceMeters: matchResult.dropoffDistanceMeters
                }
            });
            await offer.save();
        }

        const Car = require('../../models/Car');
        const driverCar = await Car.findOne({ ownerId: driverId, isDefault: true }) || await Car.findOne({ ownerId: driverId });
        const populatedOffer = await Offer.findById(offer._id)
            .populate('driverId', 'fullName photoURL rating vehicle phone')
            .lean();

        if (populatedOffer?.driverId) {
            populatedOffer.driverId.vehicle = driverCar ? {
                color: driverCar.color || '',
                marque: driverCar.marque || '',
                model: `${driverCar.marque || ''} ${driverCar.model || ''}`.trim() || 'Verified Vehicle'
            } : { model: 'Verified Vehicle' };
            populatedOffer.driverId.rating = populatedOffer.driverId.rating || 4.9;
        }

        NotificationService.emitToPassenger(passengerId, 'dispatch:offer_received', {
            ...populatedOffer,
            price: offer.price,
            clientRouteId: passengerCandidate._id,
            routeInfo: {
                driverRouteId: driverRoute._id,
                driverRouteGeometry: driverRoute.routeGeometry,
                driverStartPoint: driverRoute.startPoint,
                driverEndPoint: driverRoute.endPoint,
                clientRouteId: passengerCandidate._id,
                pickup: passengerCandidate.startPoint || passengerCandidate.pickup,
                destination: passengerCandidate.endPoint || passengerCandidate.destination
            }
        });

        DomainEventBus.publish('DriverProposedOffer', offer._id, {
            offerId: offer._id,
            driverId,
            tripInstanceId: passengerInstance._id,
            passengerId,
            price: offer.price
        });

        Metrics.count('driver_invitation_created');

        return offer;
    }
}

module.exports = DispatchServiceV2;
