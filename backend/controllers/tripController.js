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
        const routes = await Route.find({ userId: req.user.id }).sort({ createdAt: -1 });
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

        const maxDistance = 5000; // 5km
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
        const { requestId, status } = req.body; // 'accepted' or 'rejected'
        const joinRequest = await JoinRequest.findById(requestId).populate('tripId');

        if (!joinRequest) return res.status(404).json({ msg: 'Request not found' });

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
