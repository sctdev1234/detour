/**
 * ---------------------------------------------------------------------------------
 * CONTROLLER: DriverDispatchController (V2)
 * ---------------------------------------------------------------------------------
 * Purpose: Driver-facing endpoints for the V2 Dispatch pipeline.
 *          Handles incoming offer responses, status transitions, and trip lifecycle.
 * Owner Domain: Dispatch Domain
 * ---------------------------------------------------------------------------------
 */

const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const TripAssignment = require('../models/TripAssignment');
const OfferStateMachine = require('../state/OfferStateMachine');
const DomainEventBus = require('../events/DomainEventBus');
const Metrics = require('../utils/metrics');

/**
 * GET /v2/dispatch/driver/offers
 * Returns pending offers for the authenticated driver.
 */
exports.getDriverOffers = async (req, res) => {
    try {
        const driverId = req.user.id;

        const offers = await Offer.find({
            driverId,
            status: OfferStateMachine.STATES.PENDING,
            expiresAt: { $gt: new Date() }
        })
        .populate('tripInstanceId', 'pickup destination scheduledTime passengerIds')
        .sort({ createdAt: -1 })
        .lean();

        res.status(200).json({ success: true, data: offers });
    } catch (error) {
        console.error('[DriverDispatchController] getDriverOffers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

const DispatchServiceV2 = require('../services/v2/dispatchService');

/**
 * POST /v2/dispatch/driver/offer/:id/accept
 * Driver accepts an incoming offer.
 */
exports.acceptOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const driverId = req.user.id;

        const offer = await Offer.findById(id);
        if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
        if (offer.driverId.toString() !== driverId) {
            return res.status(403).json({ success: false, error: 'Offer does not belong to this driver' });
        }

        // Driver proposes an invitation for this trip to the passenger
        offer.status = 'DRIVER_PROPOSED';
        offer.respondedAt = new Date();

        let meta = offer.metadata instanceof Map ? Object.fromEntries(offer.metadata) : (offer.metadata || {});
        let clientRouteId = meta.clientRouteId;
        if (!clientRouteId && offer.tripInstanceId) {
            const TripInstance = require('../models/TripInstance');
            const ti = await TripInstance.findById(offer.tripInstanceId).lean();
            clientRouteId = ti?.metadata?.clientRouteId || (ti?.metadata?.get && ti.metadata.get('clientRouteId'));
        }
        if (!clientRouteId && offer.passengerId) {
            const Route = require('../models/Route');
            const cr = await Route.findOne({ userId: offer.passengerId, role: 'client', status: { $in: ['active', 'pending', 'searching'] } }).sort({ createdAt: -1 }).lean();
            if (cr) clientRouteId = cr._id.toString();
        }
        meta.clientRouteId = clientRouteId;
        offer.metadata = meta;
        await offer.save();

        const NotificationService = require('../services/notificationService');
        const Car = require('../models/Car');
        const driverCar = await Car.findOne({ ownerId: driverId, isDefault: true }) || await Car.findOne({ ownerId: driverId });
        const populatedOffer = await Offer.findById(offer._id)
            .populate('driverId', 'fullName photoURL rating phone')
            .lean();

        if (populatedOffer?.driverId) {
            populatedOffer.driverId.vehicle = driverCar ? {
                color: driverCar.color || '',
                marque: driverCar.marque || '',
                model: `${driverCar.marque || ''} ${driverCar.model || ''}`.trim() || 'Verified Vehicle'
            } : { model: 'Verified Vehicle' };
            populatedOffer.driverId.rating = populatedOffer.driverId.rating || 4.9;
        }

        // Emit invitation to passenger with full driver info and clientRouteId
        NotificationService.emitToPassenger(offer.passengerId, 'dispatch:offer_received', {
            ...populatedOffer,
            price: offer.counterPrice || offer.price,
            clientRouteId,
            routeInfo: {
                driverRouteId: meta.driverRouteId,
                clientRouteId: meta.clientRouteId,
                pickup: meta.pickup,
                destination: meta.destination
            }
        });

        DomainEventBus.publish('DriverProposedOffer', offer._id, {
            offerId: offer._id,
            driverId,
            tripInstanceId: offer.tripInstanceId,
            passengerId: offer.passengerId,
            price: offer.price
        });

        Metrics.count('driver_offer_proposed');

        res.status(200).json({ success: true, data: { offerId: offer._id, status: 'DRIVER_PROPOSED' } });
    } catch (error) {
        console.error('[DriverDispatchController] acceptOffer error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * POST /v2/dispatch/driver/offer/:id/reject
 * Driver rejects an incoming offer.
 */
exports.rejectOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const driverId = req.user.id;

        const offer = await Offer.findById(id);
        if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
        if (offer.driverId.toString() !== driverId) {
            return res.status(403).json({ success: false, error: 'Offer does not belong to this driver' });
        }

        // [Phase 3 Resilience Fix] Idempotency Guard
        // If a network timeout causes a mobile retry, we silently acknowledge success.
        if (offer.status === OfferStateMachine.STATES.REJECTED) {
            return res.status(200).json({ success: true, data: { offerId: offer._id, status: 'REJECTED' } });
        }

        OfferStateMachine.validateTransition(offer.status, OfferStateMachine.STATES.REJECTED);
        offer.status = OfferStateMachine.STATES.REJECTED;
        offer.respondedAt = new Date();
        offer.rejectionReason = req.body.reason || 'Driver declined';
        await offer.save();

        DomainEventBus.publish('DriverRejectedOffer', offer._id, {
            offerId: offer._id,
            driverId,
            tripInstanceId: offer.tripInstanceId
        });

        Metrics.count('driver_offer_rejected');

        res.status(200).json({ success: true, data: { offerId: offer._id, status: 'REJECTED' } });
    } catch (error) {
        console.error('[DriverDispatchController] rejectOffer error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * POST /v2/dispatch/driver/offer/:id/counter
 * Driver submits a counter-offer (price negotiation).
 */
exports.counterOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const driverId = req.user.id;
        const { counterPrice } = req.body;

        if (!counterPrice || counterPrice <= 0) {
            return res.status(400).json({ success: false, error: 'Valid counterPrice is required' });
        }

        const offer = await Offer.findById(id);
        if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });
        if (offer.driverId.toString() !== driverId) {
            return res.status(403).json({ success: false, error: 'Offer does not belong to this driver' });
        }

        if (new Date() > offer.expiresAt) {
            offer.status = OfferStateMachine.STATES.EXPIRED;
            await offer.save();
            return res.status(410).json({ success: false, error: 'Offer has expired' });
        }

        // [Phase 3 Resilience Fix] Idempotency Guard
        if (['COUNTERED', 'COUNTER_OFFERED'].includes(offer.status) && offer.counterPrice === counterPrice) {
            return res.status(200).json({ success: true, data: { offerId: offer._id, status: offer.status, counterPrice } });
        }

        // Store counter-offer data
        offer.counterPrice = counterPrice;
        offer.price = counterPrice; // Update canonical offer price to the proposed counter price
        offer.status = 'COUNTER_OFFERED';
        offer.respondedAt = new Date();

        let counterMeta = offer.metadata instanceof Map ? Object.fromEntries(offer.metadata) : (offer.metadata || {});
        let clientRouteId = counterMeta.clientRouteId;
        if (!clientRouteId && offer.tripInstanceId) {
            const TripInstance = require('../models/TripInstance');
            const ti = await TripInstance.findById(offer.tripInstanceId).lean();
            clientRouteId = ti?.metadata?.clientRouteId || (ti?.metadata?.get && ti.metadata.get('clientRouteId'));
        }
        if (!clientRouteId && offer.passengerId) {
            const Route = require('../models/Route');
            const cr = await Route.findOne({ userId: offer.passengerId, role: 'client', status: { $in: ['active', 'pending', 'searching'] } }).sort({ createdAt: -1 }).lean();
            if (cr) clientRouteId = cr._id.toString();
        }
        counterMeta.clientRouteId = clientRouteId;
        counterMeta.counterPrice = counterPrice;
        offer.metadata = counterMeta;
        await offer.save();

        const NotificationService = require('../services/notificationService');
        const Car = require('../models/Car');
        const driverCar = await Car.findOne({ ownerId: driverId, isDefault: true }) || await Car.findOne({ ownerId: driverId });
        const populatedOffer = await Offer.findById(offer._id)
            .populate('driverId', 'fullName photoURL rating phone')
            .lean();

        if (populatedOffer?.driverId) {
            populatedOffer.driverId.vehicle = driverCar ? {
                color: driverCar.color || '',
                marque: driverCar.marque || '',
                model: `${driverCar.marque || ''} ${driverCar.model || ''}`.trim() || 'Verified Vehicle'
            } : { model: 'Verified Vehicle' };
            populatedOffer.driverId.rating = populatedOffer.driverId.rating || 4.9;
        }

        // Emit invitation to passenger with full driver info, counterPrice and clientRouteId
        NotificationService.emitToPassenger(offer.passengerId, 'dispatch:offer_received', {
            ...populatedOffer,
            price: counterPrice,
            counterPrice,
            status: 'COUNTER_OFFERED',
            isCountered: true,
            clientRouteId,
            routeInfo: {
                driverRouteId: counterMeta.driverRouteId,
                clientRouteId: counterMeta.clientRouteId,
                pickup: counterMeta.pickup,
                destination: counterMeta.destination
            }
        });

        DomainEventBus.publish('DriverCounteredOffer', offer._id, {
            offerId: offer._id,
            driverId,
            tripInstanceId: offer.tripInstanceId,
            passengerId: offer.passengerId,
            counterPrice
        });

        Metrics.count('driver_offer_countered');

        res.status(200).json({ success: true, data: { offerId: offer._id, status: 'COUNTER_OFFERED', counterPrice } });
    } catch (error) {
        console.error('[DriverDispatchController] counterOffer error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * GET /v2/dispatch/driver/active
 * Returns the active trip assignment for the driver, if any.
 */
exports.getActiveTrip = async (req, res) => {
    try {
        const driverId = req.user.id;

        const assignment = await TripAssignment.findOne({ driverId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'tripInstanceId',
                match: { status: { $nin: ['COMPLETED', 'CANCELLED'] } }
            })
            .lean();

        if (!assignment || !assignment.tripInstanceId) {
            return res.status(200).json({ success: true, data: null });
        }

        res.status(200).json({ success: true, data: assignment });
    } catch (error) {
        console.error('[DriverDispatchController] getActiveTrip error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * PATCH /v2/dispatch/driver/trip/:id/status
 * Driver updates trip status (EN_ROUTE, ARRIVED, STARTED, COMPLETED).
 */
exports.updateTripStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const driverId = req.user.id;

        let instance = await TripInstance.findById(id);
        if (!instance) {
            const assign = await TripAssignment.findById(id);
            if (assign) {
                instance = await TripInstance.findById(assign.tripInstanceId);
            }
        }
        if (!instance) return res.status(404).json({ success: false, error: 'Trip not found' });

        // Verify driver is assigned
        const assignment = await TripAssignment.findOne({ tripInstanceId: instance._id, driverId });
        if (!assignment) {
            return res.status(403).json({ success: false, error: 'Driver is not assigned to this trip' });
        }

        // [Phase 3 Resilience Fix] Idempotency Guard
        // Prevents ghost failures when mobile client retries on timeout
        if (instance.status === status) {
            return res.status(200).json({ success: true, data: { tripInstanceId: instance._id, status } });
        }

        // STRICT SECURITY: Remove BOARDED / STARTED direct mutation bypass
        if (status === 'BOARDED' || status === 'STARTED') {
            return res.status(400).json({
                success: false,
                error: `Direct status transition to ${status} is prohibited. Boarding must flow through the canonical OTP verification endpoint.`
            });
        }

        // STRICT SECURITY: Remove COMPLETED direct mutation bypass
        if (status === 'COMPLETED') {
            return res.status(400).json({
                success: false,
                error: 'Direct status transition to COMPLETED is prohibited. Completion must flow through the canonical dropoff and settlement lifecycle.'
            });
        }

        // Validate allowed transitions for driver
        const DRIVER_TRANSITIONS = {
            'ASSIGNED': ['EN_ROUTE', 'ARRIVED'],
            'EN_ROUTE': ['ARRIVED'],
            'ARRIVED': [], // Must call canonical boarding endpoint with OTP!
            'BOARDED': [], // Must call canonical dropoff endpoint!
            'STARTED': []
        };

        const allowed = DRIVER_TRANSITIONS[instance.status] || [];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot transition from ${instance.status} to ${status}`
            });
        }

        const oldStatus = instance.status;

        // Transition journey to DRIVER_ARRIVED when driver arrives
        if (status === 'ARRIVED') {
            const journeyService = require('../services/journeyService');
            const PassengerJourney = require('../models/PassengerJourney');
            const journey = await PassengerJourney.findOne({
                tripInstanceId: instance._id,
                status: 'BOOKED'
            });
            if (journey) {
                await journeyService.recordDriverArrived(journey._id);
            }
        }

        instance.status = status;
        if (!instance.stateTimestamps) instance.stateTimestamps = {};
        instance.stateTimestamps[`${status.toLowerCase()}At`] = new Date();
        await instance.save();

        DomainEventBus.publish('TripStatusUpdated', instance._id, {
            tripInstanceId: instance._id,
            driverId,
            fromStatus: oldStatus,
            toStatus: status
        });

        Metrics.count(`trip_status_${status.toLowerCase()}`);

        res.status(200).json({ success: true, data: { tripInstanceId: id, status } });
    } catch (error) {
        console.error('[DriverDispatchController] updateTripStatus error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * GET /v2/dispatch/driver/recovery
 * Unified endpoint returning the complete dispatch state to recover after reconnection.
 */
exports.getRecoveryState = async (req, res) => {
    try {
        const driverId = req.user.id;
        const User = require('../models/User');
        const NotificationService = require('../services/notificationService');
        const Route = require('../models/Route');

        // 1. Fetch User status & active routes
        const user = await User.findById(driverId).select('driverStatus').lean();
        let driverStatus = user?.driverStatus || 'OFFLINE';

        const activeRoute = await Route.findOne({
            userId: driverId,
            role: 'driver',
            status: { $in: ['active', 'MATCHING'] },
            isDeleted: { $ne: true }
        }).lean();

        // If driver has active routes and is not explicitly on BREAK, preserve ONLINE status
        if (activeRoute && driverStatus !== 'BREAK') {
            driverStatus = 'ONLINE';
            await User.updateOne({ _id: driverId }, { $set: { driverStatus: 'ONLINE', lastHeartbeat: new Date() } });
        }
        
        let presence = 'OFFLINE';
        let availability = 'BUSY';

        if (driverStatus === 'ONLINE') {
            presence = 'ONLINE';
            availability = 'AVAILABLE';
        } else if (driverStatus === 'BREAK') {
            presence = 'ONLINE';
            availability = 'BREAK';
        } else if (driverStatus === 'OFFLINE') {
            presence = 'OFFLINE';
            availability = 'BUSY';
        }

        // 2. Fetch Active Trip Assignment
        const activeTrip = await TripAssignment.findOne({ driverId })
            .sort({ createdAt: -1 })
            .populate({
                path: 'tripInstanceId',
                match: { status: { $nin: ['COMPLETED', 'CANCELLED'] } }
            })
            .lean();

        let activeJourney = null;
        if (activeTrip?.tripInstanceId) {
            const PassengerJourney = require('../models/PassengerJourney');
            activeJourney = await PassengerJourney.findOne({
                tripInstanceId: activeTrip.tripInstanceId._id,
                status: { $nin: ['COMPLETED', 'CANCELLED_BY_CLIENT', 'CANCELLED_BY_DRIVER', 'NO_SHOW'] }
            }).lean();
        }

        // 3. Fetch Pending Offer
        const currentOffer = await Offer.findOne({
            driverId,
            status: { $in: [OfferStateMachine.STATES.PENDING, 'COUNTERED', 'DRIVER_PROPOSED', 'COUNTER_OFFERED'] },
            expiresAt: { $gt: new Date() }
        })
        .populate('tripInstanceId', 'pickup destination scheduledTime passengerIds')
        .sort({ createdAt: -1 })
        .lean();

        // 4. Determine dimensional tripStatus
        let tripStatus = 'NONE';
        if (activeTrip && activeTrip.tripInstanceId) {
            const instanceStatus = activeTrip.tripInstanceId.status;
            availability = 'BUSY';
            if (['ASSIGNED', 'EN_ROUTE', 'ARRIVED'].includes(instanceStatus)) {
                tripStatus = 'TO_PICKUP';
            } else if (['STARTED', 'IN_PROGRESS'].includes(instanceStatus)) {
                tripStatus = 'ACTIVE';
            } else if (instanceStatus === 'COMPLETED') {
                tripStatus = 'COMPLETED';
            }
        }

        let formattedCurrentOffer = null;
        if (currentOffer) {
            formattedCurrentOffer = {
                ...currentOffer,
                pickup: currentOffer.pickup || currentOffer.metadata?.pickup || currentOffer.tripInstanceId?.pickup,
                destination: currentOffer.destination || currentOffer.metadata?.destination || currentOffer.tripInstanceId?.destination,
                originalPrice: currentOffer.metadata?.price || currentOffer.price,
            };
        }

        res.status(200).json({
            success: true,
            data: {
                presence,
                availability,
                tripStatus,
                activeTrip: activeTrip?.tripInstanceId ? { ...activeTrip, journey: activeJourney } : null,
                currentOffer: formattedCurrentOffer,
                lastSequenceNumber
            }
        });
    } catch (error) {
        console.error('[DriverDispatchController] getRecoveryState error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * POST /v2/dispatch/driver/invite-passenger
 * Driver invites a matched passenger by creating a canonical DRIVER_PROPOSED Offer.
 */
exports.invitePassenger = async (req, res) => {
    try {
        const driverId = req.user.id;
        const offer = await DispatchServiceV2.invitePassenger(driverId, req.body);
        res.status(201).json({ success: true, data: offer });
    } catch (error) {
        console.error('[DriverDispatchController] invitePassenger error:', error);
        const statusCode = error.statusCode || (error.message.includes('not found') ? 404 : 400);
        res.status(statusCode).json({ success: false, error: error.message });
    }
};

/**
 * POST /v2/dispatch/driver/trip/:id/board
 * Driver verifies passenger OTP through canonical journeyService.boardPassenger.
 */
exports.boardPassenger = async (req, res) => {
    try {
        const { id } = req.params;
        const { otp, journeyId } = req.body;
        const driverId = req.user.id || req.user._id;

        const journeyService = require('../services/journeyService');
        const PassengerJourney = require('../models/PassengerJourney');
        const TripInstance = require('../models/TripInstance');
        const TripAssignment = require('../models/TripAssignment');

        let targetJourneyId = journeyId;
        if (!targetJourneyId) {
            let instance = await TripInstance.findById(id);
            if (!instance) {
                const assign = await TripAssignment.findById(id);
                if (assign) instance = await TripInstance.findById(assign.tripInstanceId);
            }
            if (!instance) {
                return res.status(404).json({ success: false, error: 'Trip not found' });
            }

            const activeJourney = await PassengerJourney.findOne({
                tripInstanceId: instance._id,
                status: { $in: ['BOOKED', 'DRIVER_ARRIVED'] }
            });
            if (!activeJourney) {
                const alreadyBoarded = await PassengerJourney.findOne({
                    tripInstanceId: instance._id,
                    status: 'BOARDED'
                });
                if (alreadyBoarded) {
                    return res.status(400).json({ success: false, error: 'Passenger is already boarded' });
                }
                return res.status(404).json({ success: false, error: 'No active journey awaiting boarding found for this trip' });
            }
            targetJourneyId = activeJourney._id;
        }

        const journey = await journeyService.boardPassenger(targetJourneyId, otp, { driverId });

        res.status(200).json({
            success: true,
            data: {
                journeyId: journey._id,
                tripInstanceId: journey.tripInstanceId,
                status: journey.status,
                boardedAt: journey.boardedAt
            }
        });
    } catch (error) {
        console.error('[DriverDispatchController] boardPassenger error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

/**
 * POST /v2/dispatch/driver/trip/:id/dropoff
 * Driver confirms dropoff of passenger.
 * Triggers canonical journeyService.dropoffPassenger, settlementService, and tripCompletionEngine.
 */
exports.dropoffPassenger = async (req, res) => {
    try {
        const { id } = req.params;
        const { journeyId } = req.body;
        const driverId = req.user.id || req.user._id;

        const journeyService = require('../services/journeyService');
        const PassengerJourney = require('../models/PassengerJourney');
        const TripInstance = require('../models/TripInstance');
        const TripAssignment = require('../models/TripAssignment');

        let targetJourneyId = journeyId;
        if (!targetJourneyId) {
            let instance = await TripInstance.findById(id);
            if (!instance) {
                const assign = await TripAssignment.findById(id);
                if (assign) instance = await TripInstance.findById(assign.tripInstanceId);
            }
            if (!instance) {
                return res.status(404).json({ success: false, error: 'Trip not found' });
            }

            const activeJourney = await PassengerJourney.findOne({
                tripInstanceId: instance._id,
                status: 'BOARDED'
            });
            if (!activeJourney) {
                const completedJourney = await PassengerJourney.findOne({
                    tripInstanceId: instance._id,
                    status: 'COMPLETED'
                });
                if (completedJourney) {
                    return res.status(400).json({ success: false, error: 'Passenger journey is already completed' });
                }
                return res.status(404).json({ success: false, error: 'No active boarded journey found for dropoff on this trip' });
            }
            targetJourneyId = activeJourney._id;
        }

        const result = await journeyService.dropoffPassenger(targetJourneyId, { driverId });

        res.status(200).json({
            success: true,
            data: {
                journeyId: result.journey._id,
                tripInstanceId: result.journey.tripInstanceId,
                status: result.settlement?.journey?.status || result.journey.status,
                settlement: result.settlement
            }
        });
    } catch (error) {
        console.error('[DriverDispatchController] dropoffPassenger error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

