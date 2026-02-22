const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const tripController = require('../controllers/tripController');

const validate = require('../middleware/validate');
const { createRouteSchema, joinRequestSchema, handleRequestSchema } = require('../validation/tripSchemas');

// Routes (Created by both drivers and clients)
router.post('/route', [auth, validate(createRouteSchema)], tripController.createRoute);
router.get('/route', auth, tripController.getRoutes);
router.delete('/route/:id', auth, tripController.deleteRoute);

// Search/Matching (For clients to find drivers)
router.get('/matches/:routeId', auth, tripController.searchMatches);

// Join Requests
router.post('/request-join', [auth, validate(joinRequestSchema)], tripController.sendJoinRequest);
router.post('/handle-request', [auth, validate(handleRequestSchema)], tripController.handleJoinRequest);
router.get('/requests/driver', auth, tripController.getDriverRequests);
router.get('/requests/client', auth, tripController.getClientRequests);

// Trips (Instances of Driver Routes with joined Clients)
router.get('/all', auth, tripController.getTrips);
router.patch('/:id/start', auth, tripController.startTrip);
router.patch('/:id/complete', auth, tripController.completeTrip);
router.delete('/:tripId/client/:clientId', auth, tripController.removeClient);
router.patch('/pickup', auth, tripController.confirmPickup);
router.patch('/dropoff', auth, tripController.confirmDropoff);
router.patch('/waiting', auth, tripController.clientConfirmWaiting);
router.patch('/arrived', auth, tripController.driverArrivedAtPickup);

module.exports = router;
