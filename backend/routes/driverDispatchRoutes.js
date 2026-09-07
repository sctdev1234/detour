const express = require('express');
const router = express.Router();
const controller = require('../controllers/driverDispatchController');
const { auth } = require('../middleware/auth');

// Driver Offer Management
router.get('/offers', auth, controller.getDriverOffers);
router.post('/invite-passenger', auth, controller.invitePassenger);
router.post('/offer/:id/accept', auth, controller.acceptOffer);
router.post('/offer/:id/reject', auth, controller.rejectOffer);
router.post('/offer/:id/counter', auth, controller.counterOffer);

// Driver Active Trip
router.get('/active', auth, controller.getActiveTrip);

// Driver Trip Status Updates
router.patch('/trip/:id/status', auth, controller.updateTripStatus);
router.post('/trip/:id/board', auth, controller.boardPassenger);
router.post('/trip/:id/dropoff', auth, controller.dropoffPassenger);

// Driver Recovery
router.get('/recovery', auth, controller.getRecoveryState);

module.exports = router;
