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

        // Validate not expired
        if (new Date() > offer.expiresAt) {
            offer.status = OfferStateMachine.STATES.EXPIRED;
            await offer.save();
            return res.status(410).json({ success: false, error: 'Offer has expired' });
        }

        OfferStateMachine.validateTransition(offer.status, OfferStateMachine.STATES.ACCEPTED);
        offer.status = OfferStateMachine.STATES.ACCEPTED;
        offer.respondedAt = new Date();
        await offer.save();

        // Emit domain event for downstream processing
        DomainEventBus.publish('DriverAcceptedOffer', offer._id, {
            offerId: offer._id,
            driverId,
            tripInstanceId: offer.tripInstanceId
        });

        Metrics.count('driver_offer_accepted');

        res.status(200).json({ success: true, data: { offerId: offer._id, status: 'ACCEPTED' } });
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

        // Store counter-offer data
        offer.counterPrice = counterPrice;
        offer.status = 'COUNTERED';
        offer.respondedAt = new Date();
        await offer.save();

        DomainEventBus.publish('DriverCounteredOffer', offer._id, {
            offerId: offer._id,
            driverId,
            tripInstanceId: offer.tripInstanceId,
            counterPrice
        });

        Metrics.count('driver_offer_countered');

        res.status(200).json({ success: true, data: { offerId: offer._id, status: 'COUNTERED', counterPrice } });
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

        const instance = await TripInstance.findById(id);
        if (!instance) return res.status(404).json({ success: false, error: 'Trip not found' });

        // Verify driver is assigned
        const assignment = await TripAssignment.findOne({ tripInstanceId: id, driverId });
        if (!assignment) {
            return res.status(403).json({ success: false, error: 'Driver is not assigned to this trip' });
        }

        // Validate allowed transitions for driver
        const DRIVER_TRANSITIONS = {
            'ASSIGNED': ['EN_ROUTE'],
            'EN_ROUTE': ['ARRIVED'],
            'ARRIVED': ['STARTED'],
            'STARTED': ['COMPLETED']
        };

        const allowed = DRIVER_TRANSITIONS[instance.status] || [];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Cannot transition from ${instance.status} to ${status}`
            });
        }

        instance.status = status;
        if (!instance.stateTimestamps) instance.stateTimestamps = {};
        instance.stateTimestamps[`${status.toLowerCase()}At`] = new Date();
        await instance.save();

        DomainEventBus.publish('TripStatusUpdated', instance._id, {
            tripInstanceId: instance._id,
            driverId,
            fromStatus: instance.status,
            toStatus: status
        });

        Metrics.count(`trip_status_${status.toLowerCase()}`);

        res.status(200).json({ success: true, data: { tripInstanceId: id, status } });
    } catch (error) {
        console.error('[DriverDispatchController] updateTripStatus error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};
