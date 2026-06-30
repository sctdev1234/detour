const express = require('express');
const router = express.Router();
const { auth, requireVerification } = require('../middleware/auth');
const tripController = require('../controllers/tripController');

const validate = require('../middleware/validate');
const { createRouteSchema, joinRequestSchema, handleRequestSchema } = require('../validation/tripSchemas');

// Routes (Created by both drivers and clients)
router.post('/route', [auth, requireVerification, validate(createRouteSchema)], tripController.createRoute);
router.get('/route', [auth, requireVerification], tripController.getRoutes);
router.delete('/route/:id', [auth, requireVerification], tripController.deleteRoute);

// Client Trip (convenience wrapper — creates Route internally, returns trip-shaped data)
router.post('/client-trip', [auth, requireVerification], tripController.createClientTrip);

// Search/Matching (For clients to find drivers)
router.get('/matches/:routeId', [auth, requireVerification], tripController.searchMatches);

// Join Requests
router.post('/request-join', [auth, requireVerification, validate(joinRequestSchema)], tripController.sendJoinRequest);
router.post('/handle-request', [auth, requireVerification, validate(handleRequestSchema)], tripController.handleJoinRequest);
router.get('/requests/driver', [auth, requireVerification], tripController.getDriverRequests);
router.get('/requests/client', [auth, requireVerification], tripController.getClientRequests);

// Pre-Trip Readiness & Cancellation
router.post('/:id/ready/driver', [auth, requireVerification], tripController.driverConfirmReady);
router.post('/:id/ready/client', [auth, requireVerification], tripController.clientConfirmReady);
router.post('/:id/cancel', [auth, requireVerification], tripController.cancelTrip);

// Trips (Instances of Driver Routes with joined Clients)
router.get('/all', [auth, requireVerification], tripController.getTrips);
router.patch('/:id/start', [auth, requireVerification], tripController.startTrip);
router.patch('/:id/complete', [auth, requireVerification], tripController.completeTrip);
router.delete('/:tripId/client/:clientId', [auth, requireVerification], tripController.removeClient);
router.patch('/pickup', [auth, requireVerification], tripController.confirmPickup);
router.patch('/dropoff', [auth, requireVerification], tripController.confirmDropoff);
router.patch('/waiting', [auth, requireVerification], tripController.clientConfirmWaiting);
router.patch('/arrived', [auth, requireVerification], tripController.driverArrivedAtPickup);

// Phase 7: Granular execution handlers
router.post('/cancel-pickup', [auth, requireVerification], tripController.cancelPickup);
router.post('/cancel-dropoff', [auth, requireVerification], tripController.cancelDropoff);
router.post('/client-confirm-pickup', [auth, requireVerification], tripController.clientConfirmPickedUp);
router.post('/client-confirm-dropoff', [auth, requireVerification], tripController.clientConfirmDroppedOff);
router.post('/:tripId/finish', [auth, requireVerification], tripController.finishTrip);

module.exports = router;
