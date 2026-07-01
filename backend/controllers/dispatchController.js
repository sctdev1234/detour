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
