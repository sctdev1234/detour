const RideRequest = require('../models/RideRequest');
const DriverRoute = require('../models/DriverRoute');
const Trip = require('../models/Trip');
const User = require('../models/User');

// @desc    Create a ride request (Client)
// @access  Private (Client)
exports.createRequest = async (req, res) => {
    try {
        const { pickup, destination, schedule } = req.body;

        const newRequest = new RideRequest({
            userId: req.user.id,
            pickup,
            destination,
            schedule
        });

        const savedRequest = await newRequest.save();
        res.json(savedRequest);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Create a new driver route
// @access  Private (Driver)
exports.createRoute = async (req, res) => {
    try {
        const { schedule, carId, startPoint, endPoint, waypoints, routeGeometry, price, priceType, days, timeStart, timeArrival, distanceKm, estimatedDurationMin } = req.body;

        // Construct schedule from flat structure if needed
        let finalSchedule = schedule;
        if (!finalSchedule) {
            finalSchedule = {
                days: days || [],
                time: timeStart || '',
                timeArrival: timeArrival || ''
            };
        }

        // Construct price object
        let finalPrice = {};
        if (typeof price === 'number') {
            finalPrice = {
                amount: price,
                type: priceType || 'fix'
            };
        } else if (typeof price === 'object' && price !== null) {
            finalPrice = price;
        }

        // Transform points to GeoJSON [lng, lat]
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

        // Always create a new route
        const route = new DriverRoute({
            userId: req.user.id,
            schedule: finalSchedule,
            carId,
            startPoint: formattedStart,
            endPoint: formattedEnd,
            waypoints: formattedWaypoints,
            routeGeometry,
            distanceKm,
            estimatedDurationMin,
            price: finalPrice,
            isActive: true
        });

        await route.save();
        res.json(route);
    } catch (err) {
        console.error("Error in createRoute:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Get all routes for the logged-in driver
// @access  Private (Driver)
exports.getDriverRoutes = async (req, res) => {
    try {
        const routes = await DriverRoute.find({ userId: req.user.id }).sort({ createdAt: -1 });
        res.json(routes);
    } catch (err) {
        console.error("Error in getDriverRoutes:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Delete a driver route
// @access  Private (Driver)
exports.deleteDriverRoute = async (req, res) => {
    try {
        const route = await DriverRoute.findById(req.params.id);

        if (!route) {
            return res.status(404).json({ msg: 'Route not found' });
        }

        // Check user
        if (route.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized' });
        }

        await route.deleteOne();

        res.json({ msg: 'Route removed' });
    } catch (err) {
        console.error("Error in deleteDriverRoute:", err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Route not found' });
        }
        res.status(500).send('Server Error');
    }
};

// @desc    Search for driver routes based on pickup and destination
// @access  Private (Client)
exports.searchRoutes = async (req, res) => {
    try {
        const { pickup, destination, days, time } = req.body;

        if (!pickup || !destination) {
            return res.status(400).json({ msg: 'Pickup and destination are required' });
        }

        // Search parameters:
        // Match routes within 5km of pickup and 5km of destination
        // Note: Coordinates are [lng, lat]
        const maxDistance = 5000; // 5km in meters

        const query = {
            isActive: true,
            'startPoint.coordinates': {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [pickup.longitude, pickup.latitude]
                    },
                    $maxDistance: maxDistance
                }
            },
            'endPoint.coordinates': {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [destination.longitude, destination.latitude]
                    },
                    $maxDistance: maxDistance
                }
            }
        };

        // Optional filters
        if (days && days.length > 0) {
            query['schedule.days'] = { $in: days };
        }

        // For time, we could add a window (e.g. +/- 30 mins), 
        // but for now let's keep it simple or exact match if provided.
        if (time) {
            query['schedule.time'] = time;
        }

        // Execute $near queries in sequence or use $and if supported with multiple $near (requires version 4.0+)
        // Actually, MongoDB handles multiple $near in $and sometimes, 
        // but often only one $near per query is allowed unless using $geoWithin.
        // Let's use $geoWithin with $centerSphere for one of them if needed, or filter manually.

        // Revised approach: Use $near for startPoint, then filter endPoint with $geoWithin
        const results = await DriverRoute.find({
            isActive: true,
            'startPoint.coordinates': {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [pickup.longitude, pickup.latitude]
                    },
                    $maxDistance: maxDistance
                }
            },
            'endPoint.coordinates': {
                $geoWithin: {
                    $centerSphere: [[destination.longitude, destination.latitude], maxDistance / 6378100] // meters to radians
                }
            }
        }).populate('userId', 'fullName email photoURL');

        res.json(results);
    } catch (err) {
        console.error("Error in searchRoutes:", err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Find matches for a given Ride Request (Phase 1 legacy logic)
// @access  Private
exports.findMatches = async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const request = await RideRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ msg: 'Request not found' });
        }

        // Matching start/end via geo
        const maxDistance = 5000;
        const potentialDrivers = await DriverRoute.find({
            isActive: true,
            'startPoint.coordinates': {
                $near: {
                    $geometry: {
                        type: "Point",
                        coordinates: [request.pickup.longitude, request.pickup.latitude]
                    },
                    $maxDistance: maxDistance
                }
            },
            'endPoint.coordinates': {
                $geoWithin: {
                    $centerSphere: [[request.destination.longitude, request.destination.latitude], maxDistance / 6378100]
                }
            },
            'schedule.days': { $in: request.schedule.days }
        }).populate('userId', 'fullName email photoURL');

        res.json(potentialDrivers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Confirm a trip (Create Trip)
// @access  Private
exports.confirmTrip = async (req, res) => {
    try {
        const { rideRequestId, driverId, price } = req.body;

        // Validation
        const request = await RideRequest.findById(rideRequestId);
        if (!request) return res.status(404).json({ msg: 'Ride Request not found' });

        const driver = await User.findById(driverId);
        if (!driver) return res.status(404).json({ msg: 'Driver not found' });

        // Create Trip
        const trip = new Trip({
            rideRequestId,
            driverId,
            price
        });

        await trip.save();

        // Update Request Status
        request.status = 'matched';
        await request.save();

        res.json(trip);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};
