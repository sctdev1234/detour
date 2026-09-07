/**
 * ---------------------------------------------------------------------------------
 * CONTROLLER: DispatchController (V2)
 * ---------------------------------------------------------------------------------
 * Purpose: Thin API layer exposing the Dispatch domain. Delegates all heavy
 *          lifting to DispatchService.
 * Owner Domain: Dispatch Domain
 * ---------------------------------------------------------------------------------
 */

const DispatchServiceV2 = require('../services/v2/dispatchService');
const TripTemplate = require('../models/TripTemplate');
const TripInstance = require('../models/TripInstance');
const TripStateMachine = require('../state/TripStateMachine');

exports.createTemplate = async (req, res) => {
    try {
        const { startPoint, endPoint, waypoints, schedulingStrategy, scheduleConfig, price, metadata } = req.body;
        const passengerId = req.user.id;
        const proposedFare = price || metadata?.price || 15;
        const clientRouteId = metadata?.clientRouteId || null;

        const template = new TripTemplate({
            creatorId: passengerId,
            schedulingStrategy,
            startPoint,
            endPoint,
            waypoints,
            scheduleConfig
        });
        await template.save();

        let instanceId = null;

        // If IMMEDIATE, kick off the dispatcher immediately
        if (schedulingStrategy === 'IMMEDIATE') {
            // [Phase 3 Resilience Fix] Check for an existing active instance for THIS route (Idempotency Guard)
            const instanceQuery = {
                passengerIds: passengerId,
                status: { $in: ['SEARCHING', 'OFFERS_OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'BOARDED', 'STARTED'] }
            };
            if (clientRouteId) {
                instanceQuery['metadata.clientRouteId'] = clientRouteId;
            } else {
                instanceQuery.templateId = template._id;
            }

            const existingInstance = await TripInstance.findOne(instanceQuery);

            if (existingInstance) {
                if (['SEARCHING', 'OFFERS_OPEN'].includes(existingInstance.status)) {
                    existingInstance.status = 'CANCELLED';
                    await existingInstance.save();
                } else {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Passenger already has an active immediate trip for this route. Please finish or cancel it first.',
                        data: { instanceId: existingInstance._id }
                    });
                }
            }
            const instance = new TripInstance({
                templateId: template._id,
                passengerIds: [passengerId],
                pickup: startPoint,
                destination: endPoint,
                scheduledTime: new Date(),
                status: 'SEARCHING',
                pricingSnapshot: {
                    baseFare: proposedFare,
                    currency: 'MAD'
                },
                metadata: {
                    clientRouteId,
                    price: proposedFare
                },
                stateTimestamps: {
                    searchingAt: new Date()
                }
            });
            await instance.save();
            instanceId = instance._id;

            // Fire and forget the orchestrator
            DispatchServiceV2.executeMatchingPipeline(instance);

            return res.status(201).json({ success: true, data: { templateId: template._id, instanceId, instance } });
        }

        res.status(201).json({ success: true, data: { templateId: template._id, instanceId } });
    } catch (error) {
        console.error('[DispatchController] Error creating template:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.acceptOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const passengerUserId = req.user?.id || req.user?._id;
        const idempotencyKey = req.headers['idempotency-key'];
        const OfferAcceptanceEngine = require('../services/offerAcceptanceEngine');

        const assignment = await OfferAcceptanceEngine.acceptOfferAtomic(id, passengerUserId, {
            idempotencyKey,
            endpoint: `/api/v2/dispatch/offer/${id}/accept`,
            reqBody: req.body
        });

        res.status(200).json({ success: true, data: assignment });
    } catch (error) {
        console.error('[DispatchController] Error accepting offer:', error);
        const status = error.statusCode || 400;
        res.status(status).json({ success: false, error: error.message });
    }
};

exports.rejectOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const passengerUserId = req.user?.id || req.user?._id;
        const { reason } = req.body || {};
        const Offer = require('../models/Offer');
        const NotificationService = require('../services/notificationService');
        const DomainEventBus = require('../events/DomainEventBus');

        const offer = await Offer.findById(id);
        if (!offer) return res.status(404).json({ success: false, error: 'Offer not found' });

        offer.status = 'REJECTED';
        offer.rejectedAt = new Date();
        if (reason) {
            offer.rejectionReason = reason;
        }
        await offer.save();

        const counterPrice = offer.counterPrice || offer.price;

        // Targeted notification to driver that the proposition was declined
        NotificationService.emitToDriver(offer.driverId, 'dispatch:counter_response', {
            offerId: offer._id.toString(),
            accepted: false,
            declined: true,
            counterPrice,
            reason: reason || 'Client declined the price proposition'
        });

        NotificationService.emitToDriver(offer.driverId, 'dispatch:offer_rejected', {
            offerId: offer._id.toString(),
            declined: true,
            counterPrice,
            reason: reason || 'Client declined the price proposition'
        });

        DomainEventBus.publish('OfferRejectedByPassenger', offer._id, {
            offerId: offer._id,
            driverId: offer.driverId,
            passengerId: passengerUserId,
            reason
        });

        res.status(200).json({ success: true, data: { offerId: offer._id, status: 'REJECTED' } });
    } catch (error) {
        console.error('[DispatchController] Error rejecting offer:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getRecoveryState = async (req, res) => {
    try {
        const passengerId = req.user.id;
        const Offer = require('../models/Offer');
        const TripAssignment = require('../models/TripAssignment');
        const PassengerJourney = require('../models/PassengerJourney');
        
        // 1. Find active TripInstance for passenger
        const instance = await TripInstance.findOne({ 
            passengerIds: passengerId,
            status: { $nin: ['COMPLETED', 'CANCELLED'] }
        }).sort({ createdAt: -1 }).lean();

        if (!instance) {
            return res.status(200).json({ success: true, data: null });
        }

        // 2. Find pending offers for this instance that drivers proposed
        const offers = await Offer.find({
            tripInstanceId: instance._id,
            status: { $in: ['DRIVER_PROPOSED', 'COUNTER_OFFERED', 'COUNTERED', 'CREATED', 'OFFERED'] },
            expiresAt: { $gt: new Date() }
        }).populate('driverId', 'firstName lastName fullName photoURL rating vehicle phone').lean();

        const Car = require('../models/Car');
        for (const off of offers) {
            if (off.driverId && !off.driverId.vehicle?.model) {
                const driverCar = await Car.findOne({ ownerId: off.driverId._id, isDefault: true }) || await Car.findOne({ ownerId: off.driverId._id });
                if (driverCar) {
                    off.driverId.vehicle = {
                        color: driverCar.color || '',
                        marque: driverCar.marque || '',
                        model: `${driverCar.marque || ''} ${driverCar.model || ''}`.trim() || 'Verified Vehicle'
                    };
                } else {
                    off.driverId.vehicle = { model: 'Verified Vehicle' };
                }
            }
            if (off.driverId && !off.driverId.rating) {
                off.driverId.rating = 4.9;
            }
            const cRouteId = off.metadata?.clientRouteId || instance?.metadata?.clientRouteId;
            if (cRouteId && !off.clientRouteId) {
                off.clientRouteId = cRouteId;
            }
        }

        // 3. Find assignment if any
        const assignment = await TripAssignment.findOne({
            tripInstanceId: instance._id
        }).populate('driverId').lean();

        // 4. Find journey if any
        const journey = await PassengerJourney.findOne({
            tripInstanceId: instance._id,
            passengerId
        }).lean();

        // Map status correctly based on instance and journey status
        let status = instance.status; // SEARCHING
        if (assignment) {
            status = 'ASSIGNED';
            if (instance.status === 'EN_ROUTE') status = 'EN_ROUTE';
            if (instance.status === 'ARRIVED') status = 'DRIVER_ARRIVED';
            if (instance.status === 'BOARDED') status = 'BOARDED';
            if (instance.status === 'STARTED') status = 'STARTED';
            if (journey && journey.status === 'DROPPED_OFF') status = 'DROPPED_OFF';
            if (journey && journey.status === 'COMPLETED') status = 'COMPLETED';
            if (instance.status === 'COMPLETED') status = 'COMPLETED';
        } else if (offers.length > 0) {
            status = 'OFFERS_OPEN';
        }

        res.status(200).json({
            success: true,
            data: {
                status,
                tripInstance: instance,
                offers,
                assignment,
                journey
            }
        });
    } catch (error) {
        console.error('[DispatchController] Error recovering state:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.cancelSearch = async (req, res) => {
    try {
        const passengerId = req.user.id;
        
        const { tripInstanceId, clientRouteId } = req.body || {};
        
        // Find the active TripInstance for this passenger
        const cancelQuery = { 
            passengerIds: passengerId,
            status: { $nin: ['COMPLETED', 'CANCELLED'] }
        };
        if (tripInstanceId) {
            cancelQuery._id = tripInstanceId;
        } else if (clientRouteId) {
            cancelQuery['metadata.clientRouteId'] = clientRouteId;
        }

        const instance = await TripInstance.findOne(cancelQuery);

        if (!instance) {
            return res.status(404).json({ success: false, error: 'No active trip found to cancel' });
        }

        // Enforce valid transition to CANCELLED
        TripStateMachine.validateTransition(instance.status, TripStateMachine.STATES.CANCELLED);
        instance.status = TripStateMachine.STATES.CANCELLED;
        instance.stateTimestamps = instance.stateTimestamps || {};
        instance.stateTimestamps.cancelledAt = new Date();
        await instance.save();

        // Reject pending offers
        const Offer = require('../models/Offer');
        const OfferStateMachine = require('../state/OfferStateMachine');
        await Offer.updateMany(
            { tripInstanceId: instance._id, status: OfferStateMachine.STATES.PENDING },
            { $set: { status: OfferStateMachine.STATES.REJECTED } }
        );

        // Notify client and driver via socket
        const io = req.app.get('socketio');
        if (io) {
            io.to(`trip:${instance._id}`).emit('trip_status_updated', { status: 'CANCELLED' });
        }

        res.status(200).json({ success: true, message: 'Trip search cancelled successfully' });
    } catch (error) {
        console.error('[DispatchController] Error cancelling search:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};
