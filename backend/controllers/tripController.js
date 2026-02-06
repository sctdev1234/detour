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

// @desc    Create or update driver route/availability
// @access  Private (Driver)
exports.createRoute = async (req, res) => {
    try {
        const { schedule } = req.body;

        // For now, assuming one route per driver for simplicity (Phase 1)
        let route = await DriverRoute.findOne({ userId: req.user.id });

        if (route) {
            route.schedule = schedule;
            route.isActive = true;
            await route.save();
        } else {
            route = new DriverRoute({
                userId: req.user.id,
                schedule
            });
            await route.save();
        }

        res.json(route);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

// @desc    Find matches for a given Ride Request
// @access  Private
exports.findMatches = async (req, res) => {
    try {
        const requestId = req.params.requestId;
        const request = await RideRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({ msg: 'Request not found' });
        }

        // Basic Matching Logic (Phase 1):
        // Find drivers who have AT LEAST overlapping days/time.
        // This is a naive implementation. Real geo-matching requires geospatial queries (mongo $near).
        // For Proof of Concept, we match strictly on 'time' and at least one shared day.

        const potentialDrivers = await DriverRoute.find({
            isActive: true,
            'schedule.time': request.schedule.time, // Exact time match for now
            'schedule.days': { $in: request.schedule.days } // At least one matching day
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
