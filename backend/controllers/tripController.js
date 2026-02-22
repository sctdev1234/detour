const tripService = require('../services/tripService');

exports.createRoute = async (req, res) => {
    try {
        const { createRouteSchema } = require('../validation/tripSchemas');
        const { body: validatedData } = createRouteSchema.parse({ body: req.body });

        const route = await tripService.createRoute(req.user.id, validatedData);
        res.json(route);
    } catch (err) {
        console.error("Error in createRoute:", err.message);
        if (err.name === 'ZodError') {
            return res.status(400).json({ msg: err.errors[0].message });
        }
        if (err.message === 'Valid role (driver/client) is required') return res.status(400).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.getRoutes = async (req, res) => {
    try {
        const routes = await tripService.getRoutes(req.user.id);
        res.json(routes);
    } catch (err) {
        console.error("Error in getRoutes:", err.message);
        res.status(500).send('Server Error');
    }
};

exports.deleteRoute = async (req, res) => {
    try {
        const result = await tripService.deleteRoute(req.user.id, req.params.id);
        res.json(result);
    } catch (err) {
        console.error("Error in deleteRoute:", err.message);
        if (err.message === 'Route not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.searchMatches = async (req, res) => {
    try {
        const matches = await tripService.searchMatches(req.params.routeId, req.user.role);
        res.json(matches);
    } catch (err) {
        console.error("Error in searchMatches:", err.message);
        if (err.message === 'Client route not found') return res.status(404).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.sendJoinRequest = async (req, res) => {
    try {
        const { joinRequestSchema } = require('../validation/tripSchemas');
        const { body: validatedData } = joinRequestSchema.parse({ body: req.body });

        const request = await tripService.sendJoinRequest(req.user.id, validatedData);
        res.json(request);
    } catch (err) {
        console.error("Error in sendJoinRequest:", err.message);
        if (err.name === 'ZodError') {
            return res.status(400).json({ msg: err.errors[0].message });
        }
        if (err.message === 'Request already sent') return res.status(400).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.handleJoinRequest = async (req, res) => {
    try {
        const { handleRequestSchema } = require('../validation/tripSchemas');
        const { body: validatedData } = handleRequestSchema.parse({ body: req.body });

        const request = await tripService.handleJoinRequest(req.user.id, validatedData);
        res.json(request);
    } catch (err) {
        console.error("Error in handleJoinRequest:", err.message);
        if (err.name === 'ZodError') {
            return res.status(400).json({ msg: err.errors[0].message });
        }
        if (err.message === 'Request not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.getTrips = async (req, res) => {
    try {
        const trips = await tripService.getTrips(req.user.id);
        res.json(trips);
    } catch (err) {
        console.error("Error in getTrips:", err.message);
        res.status(500).send('Server Error');
    }
};

exports.getDriverRequests = async (req, res) => {
    try {
        const requests = await tripService.getDriverRequests(req.user.id);
        res.json(requests);
    } catch (err) {
        console.error("Error in getDriverRequests:", err.message);
        res.status(500).send('Server Error');
    }
};

exports.getClientRequests = async (req, res) => {
    try {
        const requests = await tripService.getClientRequests(req.user.id);
        res.json(requests);
    } catch (err) {
        console.error("Error in getClientRequests:", err.message);
        res.status(500).send('Server Error');
    }
};

exports.startTrip = async (req, res) => {
    try {
        const trip = await tripService.startTrip(req.user.id, req.params.id);

        // Notify participants
        const io = req.app.get('socketio');
        if (io && trip) {
            io.to(`user:${trip.driverId}`).emit('trip_updated', { tripId: trip._id });
            trip.clients.forEach(c => {
                io.to(`user:${c.userId}`).emit('trip_updated', { tripId: trip._id });
            });
        }

        res.json(trip);
    } catch (err) {
        console.error("Error in startTrip:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.completeTrip = async (req, res) => {
    try {
        const trip = await tripService.completeTrip(req.user.id, req.params.id);

        // Notify participants
        const io = req.app.get('socketio');
        if (io && trip) {
            io.to(`user:${trip.driverId}`).emit('trip_updated', { tripId: trip._id });
            trip.clients.forEach(c => {
                io.to(`user:${c.userId}`).emit('trip_updated', { tripId: trip._id });
            });
        }

        res.json(trip);
    } catch (err) {
        console.error("Error in completeTrip:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.removeClient = async (req, res) => {
    try {
        const trip = await tripService.removeClient(req.user.id, req.params);
        res.json(trip);
    } catch (err) {
        console.error("Error in removeClient:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        if (err.message === 'Client not found in trip') return res.status(404).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.confirmPickup = async (req, res) => {
    try {
        const { tripId, clientId, driverLocation } = req.body;
        const trip = await tripService.confirmPickup(req.user.id, { tripId, clientId, driverLocation });

        // Notify participants
        const io = req.app.get('socketio');
        if (io && trip) {
            io.to(`user:${trip.driverId}`).emit('trip_updated', { tripId: trip._id });
            io.to(`user:${clientId}`).emit('trip_updated', { tripId: trip._id });
        }

        res.json(trip);
    } catch (err) {
        console.error("Error in confirmPickup:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        if (err.message.includes('Payment failed')) return res.status(402).json({ msg: err.message }); // 402 Payment Required
        res.status(500).send('Server Error: ' + err.message);
    }
};

exports.confirmDropoff = async (req, res) => {
    try {
        const { tripId, clientId, driverLocation } = req.body;
        const trip = await tripService.confirmDropoff(req.user.id, { tripId, clientId, driverLocation });

        // Notify participants
        const io = req.app.get('socketio');
        if (io && trip) {
            io.to(`user:${trip.driverId}`).emit('trip_updated', { tripId: trip._id });
            io.to(`user:${clientId}`).emit('trip_updated', { tripId: trip._id });
        }

        res.json(trip);
    } catch (err) {
        console.error("Error in confirmDropoff:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.clientConfirmWaiting = async (req, res) => {
    try {
        const { tripId } = req.body;
        const trip = await tripService.clientConfirmWaiting(req.user.id, tripId);

        // Notify participants
        const io = req.app.get('socketio');
        if (io && trip) {
            io.to(`user:${trip.driverId}`).emit('trip_updated', { tripId: trip._id });
            io.to(`user:${req.user.id}`).emit('trip_updated', { tripId: trip._id });
        }

        res.json(trip);
    } catch (err) {
        console.error("Error in clientConfirmWaiting:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Client not found in trip') return res.status(404).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.driverArrivedAtPickup = async (req, res) => {
    try {
        const { tripId, clientId, driverLocation } = req.body;
        const trip = await tripService.driverArrivedAtPickup(req.user.id, { tripId, clientId, driverLocation });

        // Notify participants
        const io = req.app.get('socketio');
        if (io && trip) {
            io.to(`user:${trip.driverId}`).emit('trip_updated', { tripId: trip._id });
            io.to(`user:${clientId}`).emit('trip_updated', { tripId: trip._id });
        }

        res.json(trip);
    } catch (err) {
        console.error("Error in driverArrivedAtPickup:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        if (err.message === 'Client not found in trip') return res.status(404).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.cancelPickup = async (req, res) => {
    try {
        const { tripId, clientId, reason } = req.body;
        const trip = await tripService.cancelPickup(req.user.id, { tripId, clientId, reason });
        res.json(trip);
    } catch (err) {
        console.error("Error in cancelPickup:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        if (err.message === 'Client not found in trip') return res.status(404).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.driverConfirmReady = async (req, res) => {
    try {
        const trip = await tripService.driverConfirmReady(req.user.id, req.params.id);
        res.json(trip);
    } catch (err) {
        console.error("Error in driverConfirmReady:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        res.status(400).json({ msg: err.message });
    }
};

exports.clientConfirmReady = async (req, res) => {
    try {
        const trip = await tripService.clientConfirmReady(req.user.id, req.params.id);
        res.json(trip);
    } catch (err) {
        console.error("Error in clientConfirmReady:", err.message);
        if (err.message === 'Trip not found' || err.message === 'Client not found in trip') return res.status(404).json({ msg: err.message });
        res.status(400).json({ msg: err.message });
    }
};

exports.cancelTrip = async (req, res) => {
    try {
        const { reason } = req.body;
        const trip = await tripService.cancelTrip(req.user.id, { tripId: req.params.id, reason });
        res.json(trip);
    } catch (err) {
        console.error("Error in cancelTrip:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized to cancel this trip') return res.status(401).json({ msg: err.message });
        res.status(400).json({ msg: err.message });
    }
};

exports.cancelDropoff = async (req, res) => {
    try {
        const { tripId, clientId, reason } = req.body;
        const trip = await tripService.cancelDropoff(req.user.id, { tripId, clientId, reason });
        res.json(trip);
    } catch (err) {
        console.error("Error in cancelDropoff:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        if (err.message === 'Client not found in trip') return res.status(404).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.clientConfirmPickedUp = async (req, res) => {
    try {
        const { tripId, isConfirmed, rating, reason } = req.body;
        const trip = await tripService.clientConfirmPickedUp(req.user.id, { tripId, isConfirmed, rating, reason });
        res.json(trip);
    } catch (err) {
        console.error("Error in clientConfirmPickedUp:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Client not found in trip') return res.status(404).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.clientConfirmDroppedOff = async (req, res) => {
    try {
        const { tripId, isConfirmed, rating, reason } = req.body;
        const trip = await tripService.clientConfirmDroppedOff(req.user.id, { tripId, isConfirmed, rating, reason });
        res.json(trip);
    } catch (err) {
        console.error("Error in clientConfirmDroppedOff:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Client not found in trip') return res.status(404).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.finishTrip = async (req, res) => {
    try {
        const trip = await tripService.finishTrip(req.user.id, req.params.tripId);
        res.json(trip);
    } catch (err) {
        console.error("Error in finishTrip:", err.message);
        if (err.message === 'Trip not found') return res.status(404).json({ msg: err.message });
        if (err.message === 'Not authorized') return res.status(401).json({ msg: err.message });
        if (err.message.startsWith('Cannot finish trip')) return res.status(400).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};
