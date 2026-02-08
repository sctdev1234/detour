const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const tripController = require('../controllers/tripController');

// Routes (Created by both drivers and clients)
router.post('/route', auth, tripController.createRoute);
router.get('/route', auth, tripController.getRoutes);
router.delete('/route/:id', auth, tripController.deleteRoute);

// Search/Matching (For clients to find drivers)
router.get('/matches/:routeId', auth, tripController.searchMatches);

// Join Requests
router.post('/request-join', auth, tripController.sendJoinRequest);
router.post('/handle-request', auth, tripController.handleJoinRequest);
router.get('/requests/driver', auth, tripController.getDriverRequests);
router.get('/requests/client', auth, tripController.getClientRequests);

// Trips (Instances of Driver Routes with joined Clients)
router.get('/all', auth, tripController.getTrips);
router.patch('/:id/start', auth, tripController.startTrip);
router.patch('/:id/complete', auth, tripController.completeTrip);

module.exports = router;
