const Route = require('../models/Route');
const Trip = require('../models/Trip');
const JoinRequest = require('../models/JoinRequest');
const User = require('../models/User');

class TripService {
    async createRoute(userId, routeData) {
        const {
            role, carId, startPoint, endPoint, waypoints,
            routeGeometry, price, priceType, days,
            timeStart, timeArrival, distanceKm, estimatedDurationMin
        } = routeData;

        const formattedStart = {
            type: 'Point',
            coordinates: [startPoint.longitude, startPoint.latitude],
            address: startPoint.address
        };

        const formattedEnd = {
            type: 'Point',
            coordinates: [endPoint.longitude, endPoint.latitude],
            address: endPoint.address
        };

        const formattedWaypoints = (waypoints || []).map(wp => ({
            type: 'Point',
            coordinates: [wp.longitude, wp.latitude],
            address: wp.address
        }));

        const newRoute = new Route({
            userId,
            role,
            carId: role === 'driver' ? carId : undefined,
            startPoint: formattedStart,
            endPoint: formattedEnd,
            waypoints: formattedWaypoints,
            routeGeometry,
            schedule: {
                days: days || [],
                time: timeStart || '',
                timeArrival: timeArrival || ''
            },
            distanceKm,
            estimatedDurationMin,
            price: {
                amount: price || 0,
                type: priceType || 'fix'
            },
            status: 'pending'
        });

        const savedRoute = await newRoute.save();

        // If Driver created a route, automatically create an empty Trip
        if (role === 'driver') {
            const newTrip = new Trip({
                driverId: userId,
                routeId: savedRoute._id,
                status: 'pending'
            });
            await newTrip.save();
        }

        return savedRoute;
    }

    async getRoutes(userId) {
        return await Route.find({
            userId,
            status: { $ne: 'inactive' }
        }).sort({ createdAt: -1 });
    }

    async deleteRoute(userId, routeId) {
        const route = await Route.findById(routeId);
        if (!route) throw new Error('Route not found');
        if (route.userId.toString() !== userId) throw new Error('Not authorized');

        await route.deleteOne();

        // Also clean up associated Trips if it was a driver route
        if (route.role === 'driver') {
            await Trip.deleteMany({ routeId: route._id });
        }

        return { msg: 'Route removed' };
    }

    async searchMatches(routeId) {
        const clientRoute = await Route.findById(routeId);
        if (!clientRoute) throw new Error('Client route not found');

        const maxDistance = 500000; // 500km for testing
        const pickup = clientRoute.startPoint.coordinates;
        const destination = clientRoute.endPoint.coordinates;

        // Find Driver Routes that are near
        const matches = await Route.find({
            role: 'driver',
            status: { $ne: 'inactive' },
            'startPoint.coordinates': {
                $near: {
                    $geometry: { type: "Point", coordinates: pickup },
                    $maxDistance: maxDistance
                }
            },
            'endPoint.coordinates': {
                $geoWithin: {
                    $centerSphere: [destination, maxDistance / 6378100]
                }
            },
            'schedule.days': { $in: clientRoute.schedule.days }
        }).populate('userId', 'fullName email photoURL');

        // Link with their active Trips
        const routeIds = matches.map(m => m._id);
        const trips = await Trip.find({
            routeId: { $in: routeIds },
            status: { $ne: 'completed' }
        });

        // Map trips by routeId for O(1) lookup
        const tripMap = trips.reduce((acc, trip) => {
            acc[trip.routeId.toString()] = trip;
            return acc;
        }, {});

        return matches.map(route => ({
            route,
            trip: tripMap[route._id.toString()] || null
        }));
    }

    async sendJoinRequest(clientId, { clientRouteId, tripId }) {
        const existingRequest = await JoinRequest.findOne({
            clientId,
            tripId
        });

        if (existingRequest) {
            throw new Error('Request already sent');
        }

        const joinRequest = new JoinRequest({
            clientId,
            clientRouteId,
            tripId,
            status: 'pending'
        });

        await joinRequest.save();
        return joinRequest;
    }

    async handleJoinRequest(userId, { requestId, status }) {
        const joinRequest = await JoinRequest.findById(requestId).populate('tripId');

        if (!joinRequest) throw new Error('Request not found');

        // Check if the current user is the driver of the trip
        if (joinRequest.tripId.driverId.toString() !== userId) {
            throw new Error('Not authorized');
        }

        joinRequest.status = status;
        await joinRequest.save();

        if (status === 'accepted') {
            // Update the Trip with the new client
            await Trip.findByIdAndUpdate(joinRequest.tripId._id, {
                $push: { clients: { userId: joinRequest.clientId, routeId: joinRequest.clientRouteId } }
            });

            // Mark the client route as inactive so it disappears from their Routes list
            await Route.findByIdAndUpdate(joinRequest.clientRouteId, { status: 'inactive' });

            // Set trip status to 'active'
            await Trip.findByIdAndUpdate(joinRequest.tripId._id, { status: 'active' });
        }

        return joinRequest;
    }

    async getTrips(userId) {
        return await Trip.find({
            $or: [
                { driverId: userId },
                { 'clients.userId': userId }
            ]
        }).populate('driverId', 'fullName photoURL')
            .populate('routeId')
            .populate('clients.userId', 'fullName photoURL')
            .populate('clients.routeId')
            .sort({ createdAt: -1 });
    }

    async getDriverRequests(userId) {
        const trips = await Trip.find({ driverId: userId });
        const tripIds = trips.map(t => t._id);

        return await JoinRequest.find({ tripId: { $in: tripIds }, status: 'pending' })
            .populate('clientId', 'fullName photoURL')
            .populate('clientRouteId')
            .populate('tripId');
    }

    async getClientRequests(userId) {
        return await JoinRequest.find({ clientId: userId })
            .populate({
                path: 'tripId',
                populate: { path: 'driverId', select: 'fullName photoURL' }
            })
            .sort({ createdAt: -1 });
    }

    async startTrip(userId, tripId) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        trip.status = 'active';
        await trip.save();

        return trip;
    }

    async completeTrip(userId, tripId) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        trip.status = 'completed';
        await trip.save();

        return trip;
    }

    async removeClient(userId, { tripId, clientId }) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        // Verify driver ownership
        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        // Find the client in the trip
        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        // Get the client's route ID to update its status
        const clientRouteId = trip.clients[clientIndex].routeId;

        // Remove client from trip
        trip.clients.splice(clientIndex, 1);

        // Reset trip status to 'pending'
        trip.status = 'pending';

        await trip.save();

        // Update Client Route status back to 'pending' so they can search again
        if (clientRouteId) {
            await Route.findByIdAndUpdate(clientRouteId, { status: 'pending' });
        }

        // Mark request as 'rejected'
        await JoinRequest.findOneAndUpdate(
            { tripId, clientId, status: 'accepted' },
            { status: 'rejected' }
        );

        return trip;
    }
}

module.exports = new TripService();
