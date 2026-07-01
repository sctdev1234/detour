const express = require('express');
const router = express.Router();
const { auth, requireVerification } = require('../middleware/auth');
const rideController = require('../controllers/rideController');

// Passenger endpoints
router.post('/requests', [auth, requireVerification], rideController.createRideRequest);
router.patch('/requests/:id/search', [auth, requireVerification], rideController.startSearching);
router.delete('/requests/:id', [auth, requireVerification], rideController.cancelRideRequest);
router.post('/offers/:id/accept', [auth, requireVerification], rideController.acceptOffer);
router.post('/offers/:id/reject', [auth, requireVerification], rideController.rejectOffer);

// Driver endpoints
router.get('/requests/search', [auth, requireVerification], rideController.searchNearbyRequests);
router.post('/offers', [auth, requireVerification], rideController.submitOffer);

module.exports = router;
