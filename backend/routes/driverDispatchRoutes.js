const express = require('express');
const router = express.Router();
const controller = require('../controllers/driverDispatchController');
const { auth } = require('../middleware/auth');

// Driver Offer Management
router.get('/offers', auth, controller.getDriverOffers);
router.post('/offer/:id/accept', auth, controller.acceptOffer);
router.post('/offer/:id/reject', auth, controller.rejectOffer);
router.post('/offer/:id/counter', auth, controller.counterOffer);

// Driver Active Trip
router.get('/active', auth, controller.getActiveTrip);

// Driver Trip Status Updates
router.patch('/trip/:id/status', auth, controller.updateTripStatus);
// Driver Recovery
router.get('/recovery', auth, controller.getRecoveryState);

module.exports = router;
