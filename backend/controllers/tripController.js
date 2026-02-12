const tripService = require('../services/tripService');

exports.createRoute = async (req, res) => {
    try {
        const route = await tripService.createRoute(req.user.id, req.body);
        res.json(route);
    } catch (err) {
        console.error("Error in createRoute:", err.message);
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
        const matches = await tripService.searchMatches(req.params.routeId);
        res.json(matches);
    } catch (err) {
        console.error("Error in searchMatches:", err.message);
        if (err.message === 'Client route not found') return res.status(404).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.sendJoinRequest = async (req, res) => {
    try {
        const request = await tripService.sendJoinRequest(req.user.id, req.body);
        res.json(request);
    } catch (err) {
        console.error("Error in sendJoinRequest:", err.message);
        if (err.message === 'Request already sent') return res.status(400).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.handleJoinRequest = async (req, res) => {
    try {
        const request = await tripService.handleJoinRequest(req.user.id, req.body);
        res.json(request);
    } catch (err) {
        console.error("Error in handleJoinRequest:", err.message);
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
