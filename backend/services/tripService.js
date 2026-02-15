const Route = require('../models/Route');
const Trip = require('../models/Trip');
const JoinRequest = require('../models/JoinRequest');
const User = require('../models/User');
const transactionService = require('./transactionService');

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

    async searchMatches(originId, role = 'client') {
        const route = await Route.findById(originId);
        if (!route) throw new Error('Route not found');

        const maxDistance = 500000; // 500km for testing
        const pickup = route.startPoint.coordinates;
        const destination = route.endPoint.coordinates;

        const targetRole = role === 'driver' ? 'client' : 'driver';

        // Find Matching Routes
        const matches = await Route.find({
            role: targetRole,
            status: { $in: ['pending', 'active'] }, // Include active for clients waiting? Pending is default.
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
            // 'schedule.days': { $in: route.schedule.days } // Optional: relax for now to see results
        }).populate('userId', 'fullName email photoURL');

        // Logic for Drivers searching Clients
        if (role === 'driver') {
            // Check existing requests for these clients (related to this driver's trip)
            // A Driver Route corresponds to a Trip.
            const trip = await Trip.findOne({ routeId: originId, status: { $ne: 'completed' } });

            // If no trip yet (shouldn't happen if created on route creation), or just checking matches
            // We want to see if we already sent a request to this client route
            let requestMap = {};
            if (trip) {
                const requests = await JoinRequest.find({ tripId: trip._id });
                requestMap = requests.reduce((acc, req) => {
                    acc[req.clientRouteId.toString()] = req.status;
                    return acc;
                }, {});
            }

            return matches.map(clientRoute => {
                return {
                    route: clientRoute,
                    requestStatus: requestMap[clientRoute._id.toString()] || null
                };
            });
        }

        // Logic for Clients searching Drivers (Legacy / Fallback if needed)
        // Link with their active Trips
        const routeIds = matches.map(m => m._id);
        const trips = await Trip.find({
            routeId: { $in: routeIds },
            status: { $ne: 'completed' }
        });

        const tripMap = trips.reduce((acc, trip) => {
            acc[trip.routeId.toString()] = trip;
            return acc;
        }, {});

        const requests = await JoinRequest.find({ clientRouteId: originId });
        const requestMap = requests.reduce((acc, req) => {
            acc[req.tripId.toString()] = req.status;
            return acc;
        }, {});

        return matches.map(route => {
            const trip = tripMap[route._id.toString()] || null;
            return {
                route,
                trip,
                requestStatus: trip ? requestMap[trip._id.toString()] : null
            };
        });
    }

    async sendJoinRequest(senderId, { clientRouteId, tripId, proposedPrice }) {
        const sender = await User.findById(senderId);
        if (!sender) throw new Error('User not found');

        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        let clientId, initiatedBy;

        if (trip.driverId.toString() === senderId) {
            // Sender is Driver
            initiatedBy = 'driver';
            // Find clientId from clientRouteId
            const clientRoute = await Route.findById(clientRouteId);
            if (!clientRoute) throw new Error('Client route not found');
            clientId = clientRoute.userId;
        } else {
            // Sender is Client (Legacy)
            initiatedBy = 'client';
            clientId = senderId;
        }

        const existingRequest = await JoinRequest.findOne({
            clientId,
            tripId,
            clientRouteId
        });

        if (existingRequest) {
            if (existingRequest.status === 'rejected' && initiatedBy === 'driver') {
                // Driver re-sending request
                existingRequest.status = 'pending';
                existingRequest.proposedPrice = proposedPrice;
                existingRequest.initiatedBy = 'driver';
                await existingRequest.save();
                return existingRequest;
            }
            if (existingRequest.status === 'pending') {
                throw new Error('Request already sent');
            }
            // If accepted, already joined?
        }

        const joinRequest = new JoinRequest({
            clientId,
            clientRouteId,
            tripId,
            status: 'pending',
            initiatedBy,
            proposedPrice
        });

        await joinRequest.save();
        return joinRequest;
    }

    async handleJoinRequest(userId, { requestId, status }) {
        const joinRequest = await JoinRequest.findById(requestId).populate('tripId');
        if (!joinRequest) throw new Error('Request not found');

        const trip = joinRequest.tripId;
        const isDriver = trip.driverId.toString() === userId;
        const isClient = joinRequest.clientId.toString() === userId;

        if (!isDriver && !isClient) {
            throw new Error('Not authorized');
        }

        // Logic check:
        // If initiatedBy 'driver', then Client accepts/rejects
        // If initiatedBy 'client', then Driver accepts/rejects

        if (joinRequest.initiatedBy === 'driver' && isDriver) {
            // Driver cannot accept their own request, they sent it.
            throw new Error('Waiting for client response');
        }
        if (joinRequest.initiatedBy === 'client' && isClient) {
            throw new Error('Waiting for driver response');
        }

        joinRequest.status = status;
        await joinRequest.save();

        if (status === 'accepted') {
            // Update the Trip with the new client
            await Trip.findByIdAndUpdate(trip._id, {
                $push: {
                    clients: {
                        userId: joinRequest.clientId,
                        routeId: joinRequest.clientRouteId,
                        price: joinRequest.proposedPrice // Store agreed price
                    }
                }
            });

            // Auto-reject all other pending requests for this client route
            await JoinRequest.updateMany(
                {
                    clientRouteId: joinRequest.clientRouteId,
                    _id: { $ne: joinRequest._id },
                    status: 'pending'
                },
                { status: 'rejected' }
            );

            // Mark the client route as inactive so it disappears from their Routes list
            // Or keep it active until the trip is completed? Prompt implies "added to the trip".
            // If they have other matches? Usually one trip per route.
            await Route.findByIdAndUpdate(joinRequest.clientRouteId, { status: 'inactive' });

            // Ensure trip status is active if it was pending
            if (trip.status === 'pending') {
                await Trip.findByIdAndUpdate(trip._id, { status: 'active' });
            }
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
            .populate('clientRouteId')
            .populate({
                path: 'tripId',
                populate: [
                    { path: 'driverId', select: 'fullName photoURL' },
                    { path: 'routeId' }
                ]
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
    async confirmPickup(driverId, { tripId, clientId }) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        const clientEntry = trip.clients[clientIndex];

        if (clientEntry.status === 'picked_up') throw new Error('Client already picked up');

        // Update status
        clientEntry.status = 'picked_up';

        // Use the agreed price stored in the trip
        const price = clientEntry.price;

        if (!price) {
            // Fallback if price is missing (legacy data?)
            const driverRoute = await Route.findById(trip.routeId);
            price = driverRoute.price.amount;
        }

        try {
            const transactionResult = await transactionService.processTripPayment(trip._id, clientId, driverId, price);
            clientEntry.paymentStatus = 'paid';
        } catch (paymentError) {
            console.error('Payment failed:', paymentError);
            clientEntry.paymentStatus = 'failed';
            // We still mark as picked up, but maybe flag it? 
            // Requirement: "if he has enough balance to pay... Driver confirm PickUp... System Deducted"
            // If payment fails, should we block pickup? The requirement says "Driver see... if he has enough balance".
            // So we should have checked before. But `processTripPayment` checks balance.
            // If it fails, we should probably throw an error and NOT confirm pickup? 
            // "notify the [Driver] that [System] he received the money" happens AFTER pickup confirm.
            // Let's block if payment fails.
            throw new Error(`Payment failed: ${paymentError.message}`);
        }

        await trip.save();
        return trip;
    }

    async confirmDropoff(driverId, { tripId, clientId }) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        trip.clients[clientIndex].status = 'dropped_off';
        await trip.save();

        return trip;
    }
}

module.exports = new TripService();
