/**
 * =================================================================================
 * SERVICE: OfferAcceptanceEngine
 * =================================================================================
 * Purpose: Single canonical atomic offer acceptance engine for Detour.ma.
 *          Every API endpoint and legacy entry point MUST delegate here.
 *
 * Atomically enforces inside a MongoDB transaction session:
 *  1. Passenger authorization
 *  2. Offer existence
 *  3. Offer status validity (PENDING, DRIVER_PROPOSED, COUNTER_OFFERED, COUNTERED, OFFERED)
 *  4. Expiration check
 *  5. Passenger/driver non-identity
 *  6. TripInstance existence & status validity
 *  7. Route compatibility (pickupWaypointIndex < dropoffWaypointIndex)
 *  8. Driver eligibility verification
 *  9. Passenger eligibility verification
 * 10. Active-trip constraints (driver single-active-trip check)
 * 11. Capacity validation
 * 12. Capacity reservation for exact segment interval [i, j-1]
 * 13. Double-entry escrow hold (DIGITAL or CASH commission)
 * 14. Exactly one PassengerJourney record in BOOKED state
 * 15. Secure 4-digit OTP (never exposed to driver!)
 * 16. Exactly one TripAssignment in ACTIVE state
 * 17. Offer status marked ACCEPTED
 * 18. TripInstance status marked ASSIGNED
 * 19. Competing open offers rejected and targeted notifications queued
 * 20. Targeted events emitted strictly post-commit (TripAssigned, sockets)
 *
 * Supports idempotency:
 *  - Idempotency-Key locking & response caching via IdempotencyService
 *  - Database-level duplicate acceptance guard
 * =================================================================================
 */

const mongoose = require('mongoose');
const crypto = require('crypto');
const Offer = require('../models/Offer');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
const RideRequest = require('../models/RideRequest');
const capacityService = require('./capacityService');
const escrowService = require('./escrowService');
const driverEligibilityService = require('./driverEligibilityService');
const idempotencyService = require('./idempotencyService');
const outboxService = require('./outboxService');
const NotificationService = require('./notificationService');
const DomainEventBus = require('../events/DomainEventBus');
const Metrics = require('../utils/metrics');
const TripStateMachine = require('../state/TripStateMachine');
const OfferStateMachine = require('../state/OfferStateMachine');
const JourneyStateMachine = require('../state/JourneyStateMachine');

class OfferAcceptanceEngine {
    /**
     * Canonical atomic acceptance function.
     * @param {string|mongoose.Types.ObjectId} offerId
     * @param {string|mongoose.Types.ObjectId} passengerId
     * @param {Object} [idempotencyContext] - { idempotencyKey, endpoint, reqBody, session }
     * @returns {Promise<Object>} TripAssignment with attached journey and instance
     */
    static async acceptOfferAtomic(offerId, passengerId, idempotencyContext = {}) {
        const startTime = Date.now();
        const {
            idempotencyKey,
            endpoint = '/api/v2/dispatch/offer/accept',
            reqBody = {},
            session: externalSession = null
        } = idempotencyContext;

        // -------------------------------------------------------------------------
        // IDEMPOTENCY LOCK (If Idempotency-Key provided)
        // -------------------------------------------------------------------------
        if (idempotencyKey && passengerId) {
            const lock = await idempotencyService.acquireLock(
                idempotencyKey,
                passengerId.toString(),
                endpoint,
                reqBody
            );

            if (lock.isDuplicate) {
                if (lock.inFlight) {
                    const conflictErr = new Error('Request in flight. Please retry shortly.');
                    conflictErr.statusCode = 409;
                    throw conflictErr;
                }
                return lock.cachedResponse?.body?.data || lock.cachedResponse?.body;
            }
        }

        const maxRetries = externalSession ? 1 : 5;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const session = externalSession || await mongoose.startSession();
            if (!externalSession) {
                session.startTransaction();
            }

            const pendingEvents = [];
            const targetedNotifications = [];

            try {
                // 2. Validate Offer Existence
                if (!offerId || !mongoose.Types.ObjectId.isValid(offerId)) {
                    throw new Error('Invalid offer ID format');
                }
                const offer = await Offer.findById(offerId).session(session);
                if (!offer) {
                    throw new Error('Offer not found');
                }

                // 1. Validate / Resolve Passenger Authorization Inputs
                let effectivePassengerId = passengerId || offer.passengerId;
                if (!effectivePassengerId && offer.tripInstanceId) {
                    const tempInstance = await TripInstance.findById(offer.tripInstanceId).session(session);
                    if (tempInstance && tempInstance.passengerIds && tempInstance.passengerIds.length > 0) {
                        effectivePassengerId = tempInstance.passengerIds[0];
                    }
                }

                if (!effectivePassengerId) {
                    throw new Error('Passenger ID is required for acceptance');
                }
                if (!mongoose.Types.ObjectId.isValid(effectivePassengerId)) {
                    throw new Error('Invalid passenger ID format');
                }

                // 3. Database Idempotency Guard: Offer already ACCEPTED
                if (offer.status === OfferStateMachine.STATES.ACCEPTED) {
                    const existingAssignment = await TripAssignment.findOne({
                        tripInstanceId: offer.tripInstanceId
                    }).session(session);

                    const existingJourney = await PassengerJourney.findOne({
                        tripInstanceId: offer.tripInstanceId,
                        passengerId: effectivePassengerId
                    }).session(session);

                    if (existingAssignment && existingJourney) {
                        if (!externalSession) {
                            await session.commitTransaction();
                        }
                        existingAssignment.passengerJourney = existingJourney;
                        return existingAssignment;
                    }

                    throw new Error('Offer has already been accepted');
                }

                // Validate Offer status is open for acceptance
                const acceptableStatuses = [
                    OfferStateMachine.STATES.PENDING,
                    OfferStateMachine.STATES.DRIVER_PROPOSED,
                    OfferStateMachine.STATES.COUNTER_OFFERED,
                    OfferStateMachine.STATES.COUNTERED,
                    'OFFERED'
                ];
                if (!acceptableStatuses.includes(offer.status)) {
                    throw new Error(`Cannot accept offer with status: ${offer.status}`);
                }

                // 4. Validate Expiration
                if (offer.expiresAt && new Date() > new Date(offer.expiresAt)) {
                    offer.status = OfferStateMachine.STATES.EXPIRED;
                    try {
                        await Offer.findByIdAndUpdate(offer._id, { $set: { status: OfferStateMachine.STATES.EXPIRED } });
                    } catch (e) { /* ignore */ }
                    throw new Error('Offer has expired');
                }

                // 5. Validate Passenger/Driver Relationship
                if (offer.driverId.toString() === effectivePassengerId.toString()) {
                    throw new Error('Passenger cannot accept an offer from themselves');
                }

                // Validate Passenger ownership of the offer (if specified on offer)
                if (offer.passengerId && offer.passengerId.toString() !== effectivePassengerId.toString()) {
                    throw new Error('Unauthorized: Passenger does not own this offer');
                }

                // 8. Validate Driver Eligibility
                const driverEligibility = await driverEligibilityService.checkEligibility(offer.driverId);
                if (!driverEligibility.isEligible) {
                    throw new Error(`Driver ineligible: ${driverEligibility.reasons.join(', ')}`);
                }

                // 9. Validate Passenger Eligibility
                const passengerUser = await User.findById(effectivePassengerId).session(session);
                if (!passengerUser) {
                    throw new Error('Passenger not found');
                }
                if (passengerUser.status === 'SUSPENDED' || passengerUser.isSuspended) {
                    throw new Error('Passenger account is suspended');
                }

                // 6. Validate TripInstance
                let tripInstance = null;
                if (offer.tripInstanceId) {
                    tripInstance = await TripInstance.findById(offer.tripInstanceId).session(session);
                }

                // Fallback: If offer lacks tripInstanceId but has rideRequestId, resolve/instantiate
                if (!tripInstance && (offer.rideRequestId || offer.legacyRideRequestId)) {
                    const rideRequest = await RideRequest.findById(offer.rideRequestId || offer.legacyRideRequestId).session(session);
                    if (rideRequest) {
                        const waypoints = [
                            { index: 0, name: 'Origin', location: offer.pickupLocation || rideRequest.origin?.location },
                            { index: 1, name: 'Destination', location: offer.dropoffLocation || rideRequest.destination?.location }
                        ];
                        const segmentCapacity = capacityService.initializeSegments(waypoints, 4);
                        tripInstance = new TripInstance({
                            templateId: new mongoose.Types.ObjectId(),
                            driverId: offer.driverId,
                            passengerIds: [effectivePassengerId],
                            pickup: {
                                type: 'Point',
                                coordinates: offer.pickupLocation?.coordinates || rideRequest.origin?.location?.coordinates || [-7.5898, 33.5731],
                                address: offer.pickupLocation?.address || rideRequest.origin?.name || 'Pickup Point'
                            },
                            destination: {
                                type: 'Point',
                                coordinates: offer.dropoffLocation?.coordinates || rideRequest.destination?.location?.coordinates || [-6.8498, 34.0208],
                                address: offer.dropoffLocation?.address || rideRequest.destination?.name || 'Destination Point'
                            },
                            waypoints,
                            segmentCapacity,
                            scheduledTime: offer.pickupEta || rideRequest.scheduledTime || new Date(),
                            status: TripStateMachine.STATES.OFFERS_OPEN,
                            pricingSnapshot: {
                                baseFare: offer.counterPrice || offer.price || offer.fare || 50,
                                currency: 'MAD'
                            }
                        });
                        await tripInstance.save({ session });
                        offer.tripInstanceId = tripInstance._id;
                    }
                }

                if (!tripInstance) {
                    throw new Error('TripInstance not found');
                }

                // Ensure passenger is in tripInstance.passengerIds
                if (!tripInstance.passengerIds.some(pid => pid.toString() === effectivePassengerId.toString())) {
                    if (offer.passengerId && offer.passengerId.toString() === effectivePassengerId.toString()) {
                        tripInstance.passengerIds.push(effectivePassengerId);
                    } else {
                        throw new Error('Unauthorized: Passenger is not part of this trip instance');
                    }
                }

                // Validate TripInstance status transition to ASSIGNED
                if (tripInstance.status !== TripStateMachine.STATES.ASSIGNED) {
                    TripStateMachine.validateTransition(tripInstance.status, TripStateMachine.STATES.ASSIGNED);
                }

                // 10. Validate Active-Trip Constraints
                await driverEligibilityService.assertSingleActiveTrip(offer.driverId, tripInstance._id);

                const activeExistingAssignment = await TripAssignment.findOne({
                    driverId: offer.driverId,
                    status: 'ACTIVE',
                    tripInstanceId: { $ne: tripInstance._id }
                }).session(session);
                if (activeExistingAssignment) {
                    throw new Error('Driver already has an active assigned trip');
                }

                // 7. Validate Route Compatibility & Segment Indices Interval
                let fromIndex = offer.pickupWaypointIndex ?? offer.fromWaypointIndex ?? 0;
                let toIndex = offer.dropoffWaypointIndex ?? offer.toWaypointIndex;
                if (toIndex === undefined || toIndex === null) {
                    toIndex = (tripInstance.waypoints && tripInstance.waypoints.length >= 2)
                        ? tripInstance.waypoints.length - 1
                        : 1;
                }

                if (typeof fromIndex !== 'number' || typeof toIndex !== 'number' || fromIndex < 0 || fromIndex >= toIndex) {
                    throw new Error(`Invalid route interval: pickup index ${fromIndex} must be less than dropoff index ${toIndex}`);
                }

                // Initialize segment capacity if empty
                if (!tripInstance.segmentCapacity || tripInstance.segmentCapacity.length === 0) {
                    const waypoints = (tripInstance.waypoints && tripInstance.waypoints.length >= 2)
                        ? tripInstance.waypoints
                        : [
                            { index: 0, location: tripInstance.pickup, name: tripInstance.pickup?.address || 'Origin' },
                            { index: 1, location: tripInstance.destination, name: tripInstance.destination?.address || 'Destination' }
                        ];
                    tripInstance.segmentCapacity = capacityService.initializeSegments(waypoints, tripInstance.seatCapacity || 4);
                }

                const seatsRequested = offer.seatsRequested || offer.seatsBooked || offer.seats || 1;

                // 11. Validate Capacity
                const { hasCapacity, bottleneckSegment } = capacityService.checkCapacity(
                    tripInstance.segmentCapacity,
                    fromIndex,
                    toIndex,
                    seatsRequested
                );
                if (!hasCapacity) {
                    throw new Error(`Insufficient seat capacity on route segment ${bottleneckSegment !== undefined ? bottleneckSegment : 'unknown'}`);
                }

                // 12. Reserve Capacity for exact segment interval [i, j-1]
                capacityService.reserveSeats(tripInstance, fromIndex, toIndex, seatsRequested);

                // Determine Fare and Payment Type
                const agreedPrice = offer.counterPrice || offer.price || offer.fare || 0;
                const paymentType = (offer.paymentType === 'CASH' || offer.paymentType === 'CASH_ON_BOARDING')
                    ? 'CASH_ON_BOARDING'
                    : 'DIGITAL_ESCROW';

                // 15. Generate secure 4-digit OTP
                const verificationOtp = crypto.randomInt(1000, 9999).toString();

                // 14. Create PassengerJourney
                const passengerJourney = new PassengerJourney({
                    tripInstanceId: tripInstance._id,
                    passengerId: effectivePassengerId,
                    pickupWaypointIndex: fromIndex,
                    dropoffWaypointIndex: toIndex,
                    seatsBooked: seatsRequested,
                    paymentType,
                    fareAmountMad: agreedPrice,
                    verificationOtp,
                    status: JourneyStateMachine.STATES.BOOKED
                });

                // 13. Hold Escrow according to financial rules
                let escrowJournal = null;
                if (paymentType === 'DIGITAL_ESCROW') {
                    escrowJournal = await escrowService.holdDigitalEscrow(
                        effectivePassengerId,
                        agreedPrice,
                        passengerJourney._id,
                        session
                    );
                } else {
                    // CASH: Driver wallet must have >= 50 MAD & cover 15% commission
                    const commissionMad = Number((agreedPrice * 0.15).toFixed(2));
                    escrowJournal = await escrowService.holdCashCommission(
                        offer.driverId,
                        commissionMad,
                        passengerJourney._id,
                        session
                    );
                }

                passengerJourney.escrowJournalId = escrowJournal._id;
                await passengerJourney.save({ session });

                // 16. Create TripAssignment
                const assignment = new TripAssignment({
                    tripInstanceId: tripInstance._id,
                    driverId: offer.driverId,
                    vehicleId: offer.vehicleId || null,
                    agreedPrice,
                    status: 'ACTIVE',
                    assignedAt: new Date()
                });
                await assignment.save({ session });

                // 18. Set TripInstance ASSIGNED
                tripInstance.status = TripStateMachine.STATES.ASSIGNED;
                tripInstance.assignmentId = assignment._id;
                tripInstance.driverId = offer.driverId;
                tripInstance.stateTimestamps = tripInstance.stateTimestamps || {};
                tripInstance.stateTimestamps.assignedAt = new Date();
                await tripInstance.save({ session });

                // 17. Mark Offer ACCEPTED
                OfferStateMachine.validateTransition(offer.status, OfferStateMachine.STATES.ACCEPTED);
                offer.status = OfferStateMachine.STATES.ACCEPTED;
                offer.respondedAt = new Date();
                await offer.save({ session });

                // 19. Reject Competing Open Offers
                const competingOffers = await Offer.find({
                    tripInstanceId: tripInstance._id,
                    _id: { $ne: offer._id },
                    status: {
                        $in: [
                            OfferStateMachine.STATES.PENDING,
                            OfferStateMachine.STATES.DRIVER_PROPOSED,
                            OfferStateMachine.STATES.COUNTER_OFFERED,
                            OfferStateMachine.STATES.COUNTERED,
                            'OFFERED'
                        ]
                    }
                }).session(session);

                if (competingOffers.length > 0) {
                    await Offer.updateMany(
                        {
                            tripInstanceId: tripInstance._id,
                            _id: { $ne: offer._id },
                            status: {
                                $in: [
                                    OfferStateMachine.STATES.PENDING,
                                    OfferStateMachine.STATES.DRIVER_PROPOSED,
                                    OfferStateMachine.STATES.COUNTER_OFFERED,
                                    OfferStateMachine.STATES.COUNTERED,
                                    'OFFERED'
                                ]
                            }
                        },
                        {
                            $set: {
                                status: OfferStateMachine.STATES.REJECTED,
                                respondedAt: new Date()
                            }
                        }
                    ).session(session);
                }

                // If associated with a legacy RideRequest, mark COMPLETED
                if (offer.rideRequestId || offer.legacyRideRequestId) {
                    await RideRequest.findByIdAndUpdate(
                        offer.rideRequestId || offer.legacyRideRequestId,
                        { $set: { status: 'COMPLETED' } },
                        { session }
                    );
                }

                // Transactional Outbox Event
                await outboxService.emit('TRIP_INSTANCE', tripInstance._id, 'trip.assigned', {
                    tripInstanceId: tripInstance._id,
                    assignmentId: assignment._id,
                    driverId: offer.driverId,
                    passengerId: effectivePassengerId,
                    journeyId: passengerJourney._id,
                    fareAmountMad: agreedPrice
                }, { session });

                // 20. Queue Domain & Targeted Socket Events
                // NOTE: NEVER expose OTP to the driver!
                pendingEvents.push({
                    type: 'TripAssigned',
                    id: assignment._id,
                    payload: {
                        ...assignment.toJSON(),
                        journeyId: passengerJourney._id
                    }
                });

                // Targeted Driver Notification (WITHOUT OTP)
                const metaDriverRouteId = offer.metadata && (offer.metadata.driverRouteId || (offer.metadata.get && offer.metadata.get('driverRouteId')));
                const metaClientRouteId = offer.metadata && (offer.metadata.clientRouteId || (offer.metadata.get && offer.metadata.get('clientRouteId')));

                targetedNotifications.push(() => {
                    NotificationService.emitToDriver(offer.driverId, 'dispatch:driver_assigned', {
                        tripInstanceId: tripInstance._id,
                        assignmentId: assignment._id,
                        passengerId: effectivePassengerId,
                        driverRouteId: metaDriverRouteId || tripInstance.routeId || null,
                        clientRouteId: metaClientRouteId || null,
                        pickup: tripInstance.pickup,
                        destination: tripInstance.destination,
                        fareAmountMad: agreedPrice
                    });
                });

                // Targeted Passenger Notification (WITH OTP)
                targetedNotifications.push(() => {
                    NotificationService.emitToPassenger(effectivePassengerId, 'dispatch:offer_accepted', {
                        tripInstanceId: tripInstance._id,
                        assignmentId: assignment._id,
                        driverId: offer.driverId,
                        journeyId: passengerJourney._id,
                        otp: verificationOtp,
                        fareAmountMad: agreedPrice
                    });
                });

                // Targeted Competing Drivers Notification (Rejection/Withdrawal)
                competingOffers.forEach(co => {
                    targetedNotifications.push(() => {
                        NotificationService.emitToDriver(co.driverId, 'dispatch:offer_rejected', {
                            offerId: co._id,
                            tripInstanceId: tripInstance._id,
                            reason: 'Another offer was accepted'
                        });
                    });
                });

                // Commit Transaction
                if (!externalSession) {
                    await session.commitTransaction();
                }

                // Post-Commit Event Execution
                pendingEvents.forEach(evt => DomainEventBus.publish(evt.type, evt.id, evt.payload));
                targetedNotifications.forEach(fn => {
                    try { fn(); } catch (err) { console.error('[OfferAcceptanceEngine] Notification error:', err); }
                });

                Metrics.timing('acceptance_duration_ms', Date.now() - startTime);
                Metrics.count('assignment_success');

                // Attach references for caller convenience
                assignment.passengerJourney = passengerJourney;
                assignment.tripInstance = tripInstance;
                assignment.offer = offer;
                assignment.success = true;
                assignment.tripAssignment = assignment;

                // Save Idempotency response if key provided
                if (idempotencyKey && passengerId) {
                    const responseData = {
                        success: true,
                        data: {
                            assignmentId: assignment._id,
                            tripInstanceId: tripInstance._id,
                            journeyId: passengerJourney._id,
                            status: assignment.status
                        }
                    };
                    await idempotencyService.saveResponse(idempotencyKey, 200, responseData);
                }

                return assignment;
            } catch (error) {
                if (!externalSession) {
                    try { await session.abortTransaction(); } catch (abortErr) { /* ignore */ }
                }

                const isTransient = (error.hasErrorLabel && error.hasErrorLabel('TransientTransactionError')) ||
                                    (error.errorLabels && error.errorLabels.includes('TransientTransactionError')) ||
                                    error.code === 112;

                if (isTransient && attempt < maxRetries) {
                    const delay = Math.floor(50 * attempt + Math.random() * 50);
                    await new Promise(res => setTimeout(res, delay));
                    continue;
                }

                // Release Idempotency Lock on fatal error
                if (idempotencyKey) {
                    await idempotencyService.releaseLock(idempotencyKey);
                }

                console.error(`[OfferAcceptanceEngine] Failed to accept offer ${offerId}:`, error);
                Metrics.count('assignment_failure');
                lastError = error;
                throw error;
            } finally {
                if (!externalSession) {
                    session.endSession();
                }
            }
        }

        throw lastError;
    }
}

module.exports = OfferAcceptanceEngine;
