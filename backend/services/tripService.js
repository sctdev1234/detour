const Route = require('../models/Route');
const Trip = require('../models/Trip');
const JoinRequest = require('../models/JoinRequest');
const User = require('../models/User');
const transactionService = require('./transactionService');

class TripService {
    constructor() {
        this.io = null;
        this.calculateDistance = this.calculateDistance.bind(this);
    }

    setIO(io) {
        this.io = io;
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }
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
                status: 'PENDING'
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

            // Ensure trip status is updated
            const clientsCount = trip.clients.length + 1; // including the new one
            let newTripStatus = 'PARTIAL';
            if (clientsCount >= 4) {
                newTripStatus = 'CONFIRMED';
            }
            if (trip.status !== 'STARTED' && trip.status !== 'IN_PROGRESS' && trip.status !== 'COMPLETED') {
                await Trip.findByIdAndUpdate(trip._id, { status: newTripStatus });
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
                    { path: 'routeId' },
                    {
                        path: 'clients.routeId',
                        model: 'Route',
                        select: 'routeGeometry startPoint endPoint' // Explicitly select geometry
                    },
                    {
                        path: 'clients.userId',
                        select: 'fullName photoURL'
                    }
                ]
            })
            .sort({ createdAt: -1 });
    }

    async driverConfirmReady(userId, tripId) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');
        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        if (trip.status !== 'STARTING_SOON') {
            throw new Error(`Cannot confirm ready from state: ${trip.status}`);
        }

        trip.driverReady = true;
        await trip.save();

        if (this.io) {
            this.io.to(`trip:${tripId}`).emit('trip_updated', { tripId });
        }
        return trip;
    }

    async clientConfirmReady(userId, tripId) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        const client = trip.clients.find(c => c.userId.toString() === userId);
        if (!client) throw new Error('Client not found in trip');

        if (trip.status !== 'STARTING_SOON' && trip.status !== 'CONFIRMED' && trip.status !== 'PARTIAL') {
            throw new Error(`Trip is not in a valid state to confirm readiness: ${trip.status}`);
        }

        if (client.status !== 'WAITING') {
            throw new Error(`Cannot confirm readiness. You are currently: ${client.status}`);
        }

        client.status = 'READY';
        await trip.save();

        if (this.io) {
            this.io.to(`trip:${tripId}`).emit('trip_updated', { tripId });
            this.io.to(`user:${trip.driverId}`).emit('client_ready', { tripId, clientId: userId });
        }
        return trip;
    }

    async cancelTrip(userId, { tripId, reason }) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        const isDriver = trip.driverId.toString() === userId;
        const isClient = trip.clients.some(c => c.userId.toString() === userId);

        if (!isDriver && !isClient) throw new Error('Not authorized to cancel this trip');

        if (isDriver) {
            trip.status = 'CANCELLED';
            trip.cancellationReason = reason || 'Cancelled by driver';
            trip.cancelledBy = userId;

            // Mark all clients as cancelled
            trip.clients.forEach(c => {
                c.status = 'CANCELLED';
            });

            await trip.save();

            if (this.io) {
                this.io.to(`trip:${tripId}`).emit('trip_cancelled', { tripId, reason, cancelledBy: 'Driver' });
            }
        } else if (isClient) {
            // Client cancelling their seat
            const clientIndex = trip.clients.findIndex(c => c.userId.toString() === userId);
            if (clientIndex === -1) throw new Error('Client not found');

            trip.clients[clientIndex].status = 'CANCELLED';

            // Refund logic could go here if payment was authorized/hold

            await trip.save();

            if (this.io) {
                this.io.to(`user:${trip.driverId}`).emit('client_cancelled', { tripId, clientId: userId, reason });
            }
        }

        return trip;
    }

    async startTrip(userId, tripId) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        if (trip.status !== 'CONFIRMED' && trip.status !== 'PARTIAL' && trip.status !== 'STARTING_SOON') {
            throw new Error(`Invalid Transition: Cannot start trip from state ${trip.status}`);
        }

        if (trip.status === 'STARTING_SOON' && !trip.driverReady) {
            throw new Error(`Invalid Transition: You must confirm you are ready before starting the trip.`);
        }

        trip.status = 'STARTED';
        trip.stateTimestamps = trip.stateTimestamps || {};
        trip.stateTimestamps.startedAt = new Date();
        await trip.save();

        return trip;
    }

    async completeTrip(userId, tripId) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== userId) throw new Error('Not authorized');

        if (trip.status !== 'IN_PROGRESS' && trip.status !== 'STARTED') {
            throw new Error(`Invalid Transition: Cannot complete trip from state ${trip.status}`);
        }

        trip.status = 'COMPLETED';
        trip.stateTimestamps = trip.stateTimestamps || {};
        trip.stateTimestamps.completedAt = new Date();
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

        // Reset trip status to 'PENDING'
        trip.status = 'PENDING';

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

    async confirmPickup(driverId, { tripId, clientId, driverLocation }) {
        const trip = await Trip.findById(tripId).populate('clients.routeId').populate('routeId');
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        if (trip.status !== 'ARRIVED_PICKUP' && trip.status !== 'IN_PROGRESS' && trip.status !== 'STARTED') {
            throw new Error(`Invalid Transition: Cannot confirm pickup from state ${trip.status}`);
        }

        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        const clientEntry = trip.clients[clientIndex];

        if (clientEntry.status !== 'PICKUP_INCOMING' && clientEntry.status !== 'READY' && clientEntry.status !== 'WAITING') {
            throw new Error(`Invalid Client Transition: Cannot confirm pickup for client in state ${clientEntry.status}`);
        }

        if (driverLocation && clientEntry.routeId && clientEntry.routeId.startPoint) {
            const pickupCoords = clientEntry.routeId.startPoint.coordinates; // [lng, lat]
            const distance = this.calculateDistance(driverLocation.lat, driverLocation.lng, pickupCoords[1], pickupCoords[0]);
            if (distance > 200) { // 200 meters radius
                throw new Error(`Location validation failed: You are ${Math.round(distance)}m away from pickup`);
            }
        }

        clientEntry.status = 'IN_CAR';
        trip.status = 'IN_PROGRESS';

        let price = clientEntry.price;
        if (!price) {
            const driverRoute = await Route.findById(trip.routeId);
            price = driverRoute.price.amount;
        }

        try {
            const transactionResult = await transactionService.processTripPayment(trip._id, clientId, driverId, price);
            clientEntry.paymentStatus = 'paid';
        } catch (paymentError) {
            console.error('Payment failed:', paymentError);
            clientEntry.paymentStatus = 'failed';
            throw new Error(`Payment failed: ${paymentError.message}`);
        }

        await trip.save();
        return trip;
    }

    async confirmDropoff(driverId, { tripId, clientId, driverLocation }) {
        const trip = await Trip.findById(tripId).populate('clients.routeId');
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        if (trip.status !== 'IN_PROGRESS') {
            throw new Error(`Invalid Transition: Cannot confirm dropoff from state ${trip.status}`);
        }

        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        const clientEntry = trip.clients[clientIndex];

        if (clientEntry.status !== 'IN_CAR') {
            throw new Error(`Invalid Client Transition: Cannot confirm dropoff for client in state ${clientEntry.status}`);
        }

        if (driverLocation && clientEntry.routeId && clientEntry.routeId.endPoint) {
            const dropoffCoords = clientEntry.routeId.endPoint.coordinates; // [lng, lat]
            const distance = this.calculateDistance(driverLocation.lat, driverLocation.lng, dropoffCoords[1], dropoffCoords[0]);
            if (distance > 200) { // 200 meters radius
                throw new Error(`Location validation failed: You are ${Math.round(distance)}m away from dropoff`);
            }
        }

        clientEntry.status = 'DROPPED_OFF';

        await trip.save();
        return trip;
    }

    async clientConfirmWaiting(clientId, tripId) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        const clientEntry = trip.clients[clientIndex];

        if (clientEntry.status !== 'WAITING') {
            throw new Error(`Invalid Client Transition: Cannot ready from state ${clientEntry.status}`);
        }

        clientEntry.status = 'READY';
        await trip.save();
        return trip;
    }

    async driverArrivedAtPickup(driverId, { tripId, clientId, driverLocation }) {
        const trip = await Trip.findById(tripId).populate('clients.routeId');
        if (!trip) throw new Error('Trip not found');

        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        if (trip.status !== 'STARTED' && trip.status !== 'IN_PROGRESS') {
            throw new Error(`Invalid Transition: Cannot arrive at pickup from state ${trip.status}`);
        }

        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) throw new Error('Client not found in trip');

        const clientEntry = trip.clients[clientIndex];

        if (clientEntry.status !== 'READY' && clientEntry.status !== 'WAITING') {
            throw new Error(`Invalid Client Transition: Cannot arrive for client in state ${clientEntry.status}`);
        }

        if (driverLocation && clientEntry.routeId && clientEntry.routeId.startPoint) {
            const pickupCoords = clientEntry.routeId.startPoint.coordinates; // [lng, lat]
            const distance = this.calculateDistance(driverLocation.lat, driverLocation.lng, pickupCoords[1], pickupCoords[0]);
            if (distance > 200) { // 200 meters radius
                throw new Error(`Location validation failed: You are ${Math.round(distance)}m away from pickup`);
            }
        }

        trip.status = 'ARRIVED_PICKUP';
        clientEntry.status = 'PICKUP_INCOMING';
        await trip.save();
        return trip;
    }
    // ============================================
    // PHASE 7: PICKUP, DROPOFF, & DISPUTES
    // ============================================

    async cancelPickup(driverId, { tripId, clientId, reason }) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');
        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        const clientEntry = trip.clients.find(c => c.userId.toString() === clientId);
        if (!clientEntry) throw new Error('Client not found in trip');

        if (clientEntry.status !== 'WAITING' && clientEntry.status !== 'READY' && clientEntry.status !== 'PICKUP_INCOMING') {
            throw new Error(`Cannot cancel pickup from state ${clientEntry.status}`);
        }

        clientEntry.status = 'CANCELLED_AT_PICKUP';
        trip.cancellationReason = reason;

        await trip.save();

        if (this.io) {
            this.io.to(`user:${clientId}`).emit('trip_cancelled_at_pickup', { tripId, reason });
            this.io.to(`user:${driverId}`).emit('trip_updated', { tripId });
        }

        return trip;
    }

    async cancelDropoff(driverId, { tripId, clientId, reason }) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');
        if (trip.driverId.toString() !== driverId) throw new Error('Not authorized');

        const clientEntry = trip.clients.find(c => c.userId.toString() === clientId);
        if (!clientEntry) throw new Error('Client not found in trip');

        if (clientEntry.status !== 'IN_CAR') {
            throw new Error(`Cannot cancel dropoff from state ${clientEntry.status}`);
        }

        clientEntry.status = 'CANCELLED_AT_DROPOFF';
        trip.cancellationReason = reason;

        await trip.save();

        if (this.io) {
            this.io.to(`user:${clientId}`).emit('trip_cancelled_at_dropoff', { tripId, reason });
            this.io.to(`user:${driverId}`).emit('trip_updated', { tripId });
        }

        return trip;
    }

    async clientConfirmPickedUp(clientId, { tripId, isConfirmed, rating, reason }) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        const clientEntry = trip.clients.find(c => c.userId.toString() === clientId);
        if (!clientEntry) throw new Error('Client not found in trip');

        // Driver must have marked them IN_CAR first
        if (clientEntry.status !== 'IN_CAR' && clientEntry.status !== 'PICKUP_DISPUTED') {
            throw new Error(`Cannot confirm pickup from state ${clientEntry.status}`);
        }

        if (isConfirmed) {
            // No status change (they are IN_CAR), but we can record the rating for the driver arriving on time
            if (rating) clientEntry.driverRating = rating;
        } else {
            clientEntry.status = 'PICKUP_DISPUTED';
            trip.cancellationReason = `Client Disputed Pickup: ${reason}`;
            // System could trigger refund or admin review here
        }

        await trip.save();

        if (this.io) {
            this.io.to(`user:${trip.driverId.toString()}`).emit('client_pickup_confirmed', { tripId, clientId, isConfirmed, rating });
        }

        return trip;
    }

    async clientConfirmDroppedOff(clientId, { tripId, isConfirmed, rating, reason }) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');

        const clientEntry = trip.clients.find(c => c.userId.toString() === clientId);
        if (!clientEntry) throw new Error('Client not found in trip');

        // Driver must have marked them DROPPED_OFF first
        if (clientEntry.status !== 'DROPPED_OFF' && clientEntry.status !== 'DROPOFF_DISPUTED') {
            throw new Error(`Cannot confirm dropoff from state ${clientEntry.status}`);
        }

        if (isConfirmed) {
            clientEntry.status = 'COMPLETED';
            if (rating) clientEntry.driverRating = rating;

            // Check if all clients are completed to auto-complete trip? (Prompt says Driver finishes trip)
        } else {
            clientEntry.status = 'DROPOFF_DISPUTED';
            trip.cancellationReason = `Client Disputed Dropoff: ${reason}`;
        }

        await trip.save();

        if (this.io) {
            this.io.to(`user:${trip.driverId.toString()}`).emit('client_dropoff_confirmed', { tripId, clientId, isConfirmed, rating });
        }

        return trip;
    }

    async finishTrip(driverId, tripId) {
        const trip = await Trip.findById(tripId);
        if (!trip) throw new Error('Trip not found');
        if (trip.driverId.toString() !== driverId.toString()) throw new Error('Not authorized');
        if (trip.status !== 'STARTED' && trip.status !== 'IN_PROGRESS') {
            throw new Error(`Cannot finish trip from state: ${trip.status}`);
        }

        // Verify that all clients are in terminal states
        const nonTerminalStates = ['PENDING', 'WAITING', 'CONFIRMED', 'READY', 'STARTING_SOON', 'IN_CAR'];
        const unfinishedClients = trip.clients.filter(c => nonTerminalStates.includes(c.status));

        if (unfinishedClients.length > 0) {
            throw new Error(`Cannot finish trip: ${unfinishedClients.length} client(s) are still active.`);
        }

        trip.status = 'COMPLETED';
        await trip.save();

        if (this.io) {
            this.io.to(`trip:${tripId}`).emit('trip_completed', { tripId });
            this.io.to(`user:${driverId}`).emit('trip_updated', { tripId });
            trip.clients.forEach(c => {
                this.io.to(`user:${c.userId}`).emit('trip_updated', { tripId });
            });
        }

        return trip;
    }
}

module.exports = new TripService();
