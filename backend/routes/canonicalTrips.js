const express = require('express');
const router = express.Router();
const CanonicalTripController = require('../controllers/canonicalTripController');
const { protect, authorize, requireVerifiedTransactionalUser } = require('../middleware/auth');

// All endpoints require authenticated user
router.use(protect);

// Booking & Sub-Journey Lifecycle
router.post('/book-seat', requireVerifiedTransactionalUser, CanonicalTripController.bookSeat);
router.post('/driver-arrive', CanonicalTripController.driverArrive);
router.post('/board-passenger', CanonicalTripController.boardPassenger);
router.post('/dropoff-passenger', CanonicalTripController.dropoffPassenger);

// Cancellation & No-Show
router.post('/cancel-journey', CanonicalTripController.cancelJourney);
router.post('/no-show', CanonicalTripController.recordNoShow);

// Disputes
router.post('/dispute', CanonicalTripController.openDispute);
router.post('/dispute/resolve', authorize('admin'), CanonicalTripController.resolveDispute);

// Driver Withdrawal
router.post('/withdraw', requireVerifiedTransactionalUser, CanonicalTripController.requestWithdrawal);

// Secondary Marketplace
router.post('/offers/:id/accept', requireVerifiedTransactionalUser, CanonicalTripController.acceptOffer);

// Authoritative State Sync on Reconnect
router.get('/active-state', CanonicalTripController.getActiveState);

module.exports = router;
