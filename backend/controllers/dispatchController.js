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
        const { startPoint, endPoint, waypoints, schedulingStrategy, scheduleConfig } = req.body;
        const passengerId = req.user.id;

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
            // [Phase 3 Resilience Fix] Check for an existing active instance (Idempotency Guard)
            const existingInstance = await TripInstance.findOne({
                passengerIds: passengerId,
                status: { $in: ['SEARCHING', 'OFFERS_OPEN', 'ASSIGNED', 'EN_ROUTE', 'ARRIVED', 'BOARDED', 'STARTED'] }
            });

            if (existingInstance) {
                return res.status(400).json({ 
                    success: false, 
                    error: 'Passenger already has an active immediate trip. Please finish or cancel it first.',
                    data: { instanceId: existingInstance._id }
                });
            }
            const instance = new TripInstance({
                templateId: template._id,
                passengerIds: [passengerId],
                pickup: startPoint,
                destination: endPoint,
                scheduledTime: new Date(),
                status: 'SEARCHING',
                stateTimestamps: {
                    searchingAt: new Date()
                }
            });
            await instance.save();
            instanceId = instance._id;

            // Fire and forget the orchestrator
            DispatchServiceV2.executeMatchingPipeline(instance);
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
        // In production, verify req.user.id == offer.passengerId

        const assignment = await DispatchServiceV2.acceptOffer(id);
        
        res.status(200).json({ success: true, data: assignment });
    } catch (error) {
        console.error('[DispatchController] Error accepting offer:', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getRecoveryState = async (req, res) => {
    try {
        const passengerId = req.user.id;
        const Offer = require('../models/Offer');
        const TripAssignment = require('../models/TripAssignment');
        
        // 1. Find active TripInstance for passenger
        const instance = await TripInstance.findOne({ 
            passengerIds: passengerId,
            status: { $nin: ['COMPLETED', 'CANCELLED'] }
        }).sort({ createdAt: -1 }).lean();

        if (!instance) {
            return res.status(200).json({ success: true, data: null });
        }

        // 2. Find pending offers for this instance
        const offers = await Offer.find({
            tripInstanceId: instance._id,
            status: { $in: ['PENDING', 'COUNTERED'] },
            expiresAt: { $gt: new Date() }
        }).populate('driverId', 'firstName lastName rating profileImage').lean();

        // 3. Find assignment if any
        const assignment = await TripAssignment.findOne({
            tripInstanceId: instance._id
        }).populate('driverId').lean();

        // Map status correctly based on instance status
        let status = instance.status; // SEARCHING
        if (assignment) {
            status = 'ASSIGNED';
            if (instance.status === 'EN_ROUTE') status = 'EN_ROUTE';
            if (instance.status === 'ARRIVED') status = 'ARRIVED';
            if (instance.status === 'STARTED') status = 'STARTED';
        } else if (offers.length > 0) {
            status = 'OFFERS_RECEIVED';
        }

        res.status(200).json({
            success: true,
            data: {
                status,
                tripInstance: instance,
                offers,
                assignment
            }
        });
    } catch (error) {
        console.error('[DispatchController] getRecoveryState error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.cancelSearch = async (req, res) => {
    try {
        const passengerId = req.user.id;
        
        // Find the active TripInstance for this passenger
        const instance = await TripInstance.findOne({ 
            passengerIds: passengerId,
            status: { $nin: ['COMPLETED', 'CANCELLED'] }
        });

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
