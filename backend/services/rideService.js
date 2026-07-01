const TripTemplate = require('../models/TripTemplate');
const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const Trip = require('../models/Trip');
const AppError = require('../utils/AppError');
const DispatchService = require('./dispatchService');
const { transitionState } = require('../utils/stateMachine');

class RideService {
    constructor() {
        this.io = null;
    }

    setIO(io) {
        this.io = io;
    }

    async createRideRequest(passengerId, data) {
        const { startPoint, endPoint, pricingMetrics, recurrenceType, scheduledDeparture, schedule } = data;
        
        // 1. Create the unified TripTemplate
        const template = new TripTemplate({
            userId: passengerId,
            role: 'passenger',
            startPoint: {
                type: 'Point',
                coordinates: [startPoint.longitude, startPoint.latitude],
                address: startPoint.address
            },
            endPoint: {
                type: 'Point',
                coordinates: [endPoint.longitude, endPoint.latitude],
                address: endPoint.address
            },
            pricing: {
                amount: pricingMetrics.basePrice,
                type: 'fix'
            },
            recurrenceType: recurrenceType || 'IMMEDIATE',
            scheduledDeparture,
            schedule,
            distanceKm: pricingMetrics.estimatedDistance / 1000,
            estimatedDurationMin: pricingMetrics.estimatedDuration / 60
        });

        await template.save();

        // 2. If IMMEDIATE, spawn a TripInstance immediately
        if (template.recurrenceType === 'IMMEDIATE') {
            const instance = new TripInstance({
                templateId: template._id,
                userId: passengerId,
                role: 'passenger',
                departureTime: new Date(),
                startPoint: template.startPoint,
                endPoint: template.endPoint,
                distanceKm: template.distanceKm,
                estimatedDurationMin: template.estimatedDurationMin,
                pricing: pricingMetrics,
                status: 'DRAFT'
            });
            await instance.save();
            return { template, instance };
        }

        return { template };
    }

    async startSearching(instanceId, passengerId) {
        const instance = await TripInstance.findOne({ _id: instanceId, userId: passengerId });
        if (!instance) throw new AppError('Trip instance not found', 404);
        
        // State machine validation via utility
        await transitionState(instance, 'SEARCHING');

        if (this.io) {
            // Find eligible drivers via Dispatch Engine and ping them
            const drivers = await DispatchService.findEligibleDrivers(instance);
            drivers.forEach(driver => {
                this.io.to(`user:${driver._id.toString()}`).emit('ride:created', instance);
            });
        }

        // Setup radius expansion timer (60s)
        setTimeout(async () => {
            const expanded = await DispatchService.expandSearchRadius(instanceId);
            if (expanded && this.io) {
                this.io.emit('ride:updated', { id: instanceId, searchRadius: expanded.searchRadius });
            }
        }, 60000);

        return instance;
    }

    async cancelRideRequest(instanceId, passengerId) {
        const instance = await TripInstance.findOne({ _id: instanceId, userId: passengerId });
        if (!instance) throw new AppError('Trip instance not found', 404);
        
        await transitionState(instance, 'CANCELLED_BY_PASSENGER');

        if (this.io) {
            this.io.emit('ride:cancelled', { id: instanceId });
        }
    }

    async searchNearbyRequests(lat, lng) {
        // Find searching instances within 5km for drivers
        return await TripInstance.find({
            status: { $in: ['SEARCHING', 'OFFERS_OPEN'] },
            role: 'passenger',
            startPoint: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    },
                    $maxDistance: 5000 
                }
            }
        }).populate('userId', 'firstName lastName profilePicture rating');
    }

    async submitOffer(driverId, data) {
        const { tripInstanceId, proposedPrice, etaMinutes } = data;
        
        const instance = await TripInstance.findById(tripInstanceId);
        if (!instance) throw new AppError('Trip instance not found', 404);
        if (!['SEARCHING', 'OFFERS_OPEN'].includes(instance.status)) {
            throw new AppError('Instance is no longer accepting offers', 400);
        }

        if (instance.status === 'SEARCHING') {
            await transitionState(instance, 'OFFERS_OPEN');
        }

        const offer = new Offer({
            tripInstanceId,
            driverId,
            proposedPrice,
            etaMinutes
        });

        await offer.save();

        if (this.io) {
            this.io.to(`user:${instance.userId.toString()}`).emit('offer:received', offer);
        }

        return offer;
    }

    async acceptOffer(offerId, passengerId) {
        // DispatchService handles race conditions using atomic update
        const { tripInstance, newTrip } = await DispatchService.acceptOffer(offerId, passengerId);

        if (this.io) {
            const offer = await Offer.findById(offerId);
            this.io.to(`user:${offer.driverId.toString()}`).emit('offer:accepted', { tripId: newTrip._id });
        }

        return newTrip;
    }

    async rejectOffer(offerId, passengerId) {
        const offer = await Offer.findById(offerId).populate('tripInstanceId');
        if (!offer) throw new AppError('Offer not found', 404);
        
        if (offer.tripInstanceId.userId.toString() !== passengerId.toString()) {
            throw new AppError('Unauthorized', 403);
        }

        offer.status = 'REJECTED';
        await offer.save();

        if (this.io) {
            this.io.to(`user:${offer.driverId.toString()}`).emit('offer:rejected', { offerId });
        }
    }
}

module.exports = new RideService();
