const Route = require('../models/Route');
const Trip = require('../models/Trip');
const JoinRequest = require('../models/JoinRequest');
const User = require('../models/User');

// @desc    Create a new route (Driver or Client)
// @access  Private
exports.createRoute = async (req, res) => {
    try {
        const {
            role, carId, startPoint, endPoint, waypoints,
            routeGeometry, price, priceType, days,
            timeStart, timeArrival, distanceKm, estimatedDurationMin
        } = req.body;

        console.log('createRoute called for user:', req.user.id, 'role:', role);
        console.log('Body:', JSON.stringify(req.body, null, 2));

        if (!role || !['driver', 'client'].includes(role)) {
            return res.status(400).json({ msg: 'Valid role (driver/client) is required' });
        }

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
            userId: req.user.id,
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
                driverId: req.user.id,
                routeId: savedRoute._id,
                status: 'pending'
            });
            await newTrip.save();
        }

        res.json(savedRoute);
    } catch (err) {
        console.error("Error in createRoute:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all routes for the logged-in user
// @access  Private
exports.getRoutes = async (req, res) => {
    try {
        const routes = await Route.find({
            userId: req.user.id,
            status: { $ne: 'inactive' }
        }).sort({ createdAt: -1 });
        res.json(routes);
    } catch (err) {
        console.error("Error in getRoutes:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a route
// @access  Private
exports.deleteRoute = async (req, res) => {
    try {
        const route = await Route.findById(req.params.id);
        if (!route) return res.status(404).json({ msg: 'Route not found' });
        if (route.userId.toString() !== req.user.id) return res.status(401).json({ msg: 'Not authorized' });

        await route.deleteOne();

        // Also clean up associated Trips if it was a driver route
        if (route.role === 'driver') {
            await Trip.deleteMany({ routeId: route._id });
        }

        res.json({ msg: 'Route removed' });
    } catch (err) {
        console.error("Error in deleteRoute:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Search for driver routes/trips for a client route
// @access  Private
exports.searchMatches = async (req, res) => {
    try {
        const { routeId } = req.params;
        const clientRoute = await Route.findById(routeId);
        if (!clientRoute) return res.status(404).json({ msg: 'Client route not found' });

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
        const detailedMatches = await Promise.all(matches.map(async (route) => {
            const trip = await Trip.findOne({ routeId: route._id, status: { $ne: 'completed' } });
            return {
                route,
                trip
            };
        }));

        res.json(detailedMatches);
    } catch (err) {
        console.error("Error in searchMatches:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Send a join request (Client -> Trip)
// @access  Private
exports.sendJoinRequest = async (req, res) => {
    try {
        const { clientRouteId, tripId } = req.body;

        const existingRequest = await JoinRequest.findOne({
            clientId: req.user.id,
            clientRouteId,
            tripId
        });

        if (existingRequest) {
            return res.status(400).json({ msg: 'Request already sent' });
        }

        const joinRequest = new JoinRequest({
            clientId: req.user.id,
            clientRouteId,
            tripId,
            status: 'pending'
        });

        await joinRequest.save();
        res.json(joinRequest);
    } catch (err) {
        console.error("Error in sendJoinRequest:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Handle join request (Driver accepts/rejects)
// @access  Private (Driver)
exports.handleJoinRequest = async (req, res) => {
    try {
        console.log('handleJoinRequest called');
        const { requestId, status } = req.body; // 'accepted' or 'rejected'
        const joinRequest = await JoinRequest.findById(requestId).populate('tripId');

        if (!joinRequest) {
            console.log('Request not found');
            return res.status(404).json({ msg: 'Request not found' });
        }
        console.log('Request found, Trip Driver:', joinRequest.tripId.driverId);

        // Check if the current user is the driver of the trip
        if (joinRequest.tripId.driverId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
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

            // If the trip reaches capacity (could add a car capacity check here), set status to 'active'
            // For now, let's just keep it 'pending' or move to 'active' if at least 1 client joined?
            // User said: "when Trip is full (requested clients), both of the Client and Driver can see it in his app/trips page (status active)"
            // Since we don't have capacity defined yet, let's just update trip status to active for now.
            await Trip.findByIdAndUpdate(joinRequest.tripId._id, { status: 'active' });
        }

        res.json(joinRequest);
    } catch (err) {
        console.error("Error in handleJoinRequest:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all trips for the logged-in user
// @access  Private
exports.getTrips = async (req, res) => {
    try {
        const userId = req.user.id;
        const trips = await Trip.find({
            $or: [
                { driverId: userId },
                { 'clients.userId': userId }
            ]
        }).populate('driverId', 'fullName photoURL')
            .populate('routeId')
            .populate('clients.userId', 'fullName photoURL')
            .populate('clients.routeId')
            .sort({ createdAt: -1 });

        res.json(trips);
    } catch (err) {
        console.error("Error in getTrips:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get requests for driver
// @access  Private (Driver)
exports.getDriverRequests = async (req, res) => {
    try {
        const trips = await Trip.find({ driverId: req.user.id });
        const tripIds = trips.map(t => t._id);

        const requests = await JoinRequest.find({ tripId: { $in: tripIds }, status: 'pending' })
            .populate('clientId', 'fullName photoURL')
            .populate('clientRouteId')
            .populate('tripId');

        res.json(requests);
    } catch (err) {
        console.error("Error in getDriverRequests:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get requests for client
// @access  Private (Client)
exports.getClientRequests = async (req, res) => {
    try {
        const requests = await JoinRequest.find({ clientId: req.user.id })
            .populate({
                path: 'tripId',
                populate: { path: 'driverId', select: 'fullName photoURL' }
            })
            .sort({ createdAt: -1 });

        res.json(requests);
    } catch (err) {
        console.error("Error in getClientRequests:", err.message);
        res.status(500).send('Server Error');
    }
};
// @desc    Start a trip (Driver)
// @access  Private (Driver)
exports.startTrip = async (req, res) => {
    try {
        console.log('startTrip called with ID:', req.params.id);
        const trip = await Trip.findById(req.params.id);
        if (!trip) {
            console.log('Trip not found in startTrip');
            return res.status(404).json({ msg: 'Trip not found' });
        }
        console.log('Trip found, Driver:', trip.driverId);

        if (trip.driverId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        if (trip.status !== 'pending' && trip.status !== 'active') { // Allow re-start if needed or strict?
            // strict: if (trip.status !== 'pending') return res.status(400).json({ msg: 'Trip cannot be started' });
            // Let's allow idempotent start for now
        }

        trip.status = 'active';
        await trip.save();

        // Also update the underlying route status?
        // await Route.findByIdAndUpdate(trip.routeId, { status: 'active' });

        res.json(trip);
    } catch (err) {
        console.error("Error in startTrip:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Complete a trip (Driver)
// @access  Private (Driver)
exports.completeTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        if (!trip) return res.status(404).json({ msg: 'Trip not found' });

        if (trip.driverId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        trip.status = 'completed';
        await trip.save();

        res.json(trip);
    } catch (err) {
        console.error("Error in completeTrip:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Remove a client from a trip (Driver)
// @access  Private (Driver)
exports.removeClient = async (req, res) => {
    try {
        console.log('removeClient called with tripId:', req.params.tripId, 'clientId:', req.params.clientId);
        const { tripId, clientId } = req.params;

        const trip = await Trip.findById(tripId);
        if (!trip) return res.status(404).json({ msg: 'Trip not found' });

        // Verify driver ownership
        if (trip.driverId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'Not authorized' });
        }

        // Find the client in the trip
        const clientIndex = trip.clients.findIndex(c => c.userId.toString() === clientId);
        if (clientIndex === -1) {
            return res.status(404).json({ msg: 'Client not found in trip' });
        }

        // Get the client's route ID to update its status
        const clientRouteId = trip.clients[clientIndex].routeId;

        // Remove client from trip
        trip.clients.splice(clientIndex, 1);

        // If no clients left and status was active, maybe revert to pending?
        // Let's keep status as is for now unless requirements specify otherwise.

        await trip.save();

        // Update Client Route status back to 'pending' so they can search again
        if (clientRouteId) {
            await Route.findByIdAndUpdate(clientRouteId, { status: 'pending' });
        }

        // Also update any JoinRequest to 'rejected' or 'removed'?
        // Let's mark it as 'rejected' so it's clear history
        await JoinRequest.findOneAndUpdate(
            { tripId, clientId, status: 'accepted' },
            { status: 'rejected' }
        );

        res.json(trip);
    } catch (err) {
        console.error("Error in removeClient:", err.message);
        res.status(500).send('Server Error');
    }
};
