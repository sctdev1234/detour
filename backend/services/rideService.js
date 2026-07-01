const RideRequest = require('../models/RideRequest');
const Offer = require('../models/Offer');
const Trip = require('../models/Trip');
const AppError = require('../utils/AppError');

class RideService {
    constructor() {
        this.io = null;
    }

    setIO(io) {
        this.io = io;
    }

    async createRideRequest(passengerId, data) {
        const { startPoint, endPoint, pricingMetrics, rideType, scheduledDeparture } = data;
        
        const request = new RideRequest({
            passengerId,
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
            pricingMetrics,
            rideType: rideType || 'IMMEDIATE',
            scheduledDeparture
        });

        await request.save();
        return request;
    }

    async startSearching(requestId, passengerId) {
        const request = await RideRequest.findOne({ _id: requestId, passengerId });
        if (!request) throw new AppError('Ride request not found', 404);
        if (request.status !== 'DRAFT') throw new AppError('Request is already active', 400);

        request.status = 'SEARCHING';
        request.expiresAt = new Date(Date.now() + 180000); // 3 minutes timeout for Immediate
        await request.save();

        if (this.io) {
            // Broadcast to drivers in area (simulated broadcast event)
            this.io.emit('ride:created', request);
        }

        // Setup radius expansion timer
        setTimeout(async () => {
            const reqCheck = await RideRequest.findById(requestId);
            if (reqCheck && reqCheck.status === 'SEARCHING') {
                reqCheck.searchRadius = 5000; // Expand to 5km
                await reqCheck.save();
                if (this.io) this.io.emit('ride:updated', { id: requestId, searchRadius: 5000 });
            }
        }, 60000); // 60s

        return request;
    }

    async cancelRideRequest(requestId, passengerId) {
        const request = await RideRequest.findOne({ _id: requestId, passengerId });
        if (!request) throw new AppError('Ride request not found', 404);
        
        request.status = 'CANCELLED';
        await request.save();

        if (this.io) {
            this.io.emit('ride:cancelled', { id: requestId });
        }
    }

    async searchNearbyRequests(lat, lng) {
        // Find searching requests within max radius of 5km
        return await RideRequest.find({
            status: { $in: ['SEARCHING', 'OFFERS_INCOMING'] },
            startPoint: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: [lng, lat]
                    },
                    $maxDistance: 5000 
                }
            }
        }).populate('passengerId', 'firstName lastName profilePicture rating');
    }

    async submitOffer(driverId, data) {
        const { rideRequestId, proposedPrice, etaMinutes } = data;
        
        const request = await RideRequest.findById(rideRequestId);
        if (!request) throw new AppError('Ride request not found', 404);
        if (!['SEARCHING', 'OFFERS_INCOMING'].includes(request.status)) {
            throw new AppError('Request is no longer accepting offers', 400);
        }

        // Update request status
        if (request.status === 'SEARCHING') {
            request.status = 'OFFERS_INCOMING';
            await request.save();
        }

        const offer = new Offer({
            rideRequestId,
            driverId,
            proposedPrice,
            etaMinutes
        });

        await offer.save();

        if (this.io) {
            this.io.to(request.passengerId.toString()).emit('offer:received', offer);
        }

        return offer;
    }

    async acceptOffer(offerId, passengerId) {
        const offer = await Offer.findById(offerId).populate('rideRequestId');
        if (!offer) throw new AppError('Offer not found', 404);
        
        const request = offer.rideRequestId;
        if (request.passengerId.toString() !== passengerId.toString()) {
            throw new AppError('Unauthorized', 403);
        }
        if (offer.status !== 'PENDING') throw new AppError('Offer is no longer available', 400);

        // Update states
        offer.status = 'ACCEPTED';
        await offer.save();

        request.status = 'ACCEPTED';
        await request.save();

        // Expire all other offers
        await Offer.updateMany(
            { rideRequestId: request._id, _id: { $ne: offerId } },
            { $set: { status: 'REJECTED' } }
        );

        // Create official Trip
        const trip = new Trip({
            driverId: offer.driverId,
            routeId: request._id, // Will adapt this field mapping later
            clients: [{
                userId: passengerId,
                price: offer.proposedPrice,
                status: 'WAITING'
            }],
            status: 'DRIVER_GOING'
        });

        await trip.save();

        if (this.io) {
            this.io.to(offer.driverId.toString()).emit('offer:accepted', { tripId: trip._id });
        }

        return trip;
    }

    async rejectOffer(offerId, passengerId) {
        const offer = await Offer.findById(offerId).populate('rideRequestId');
        if (!offer) throw new AppError('Offer not found', 404);
        
        if (offer.rideRequestId.passengerId.toString() !== passengerId.toString()) {
            throw new AppError('Unauthorized', 403);
        }

        offer.status = 'REJECTED';
        await offer.save();

        if (this.io) {
            this.io.to(offer.driverId.toString()).emit('offer:rejected', { offerId });
        }
    }
}

module.exports = new RideService();
