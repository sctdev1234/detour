const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const tripController = require('../controllers/tripController');

// @route   POST api/trip/request
// @desc    Create a ride request
// @access  Private
router.post('/request', auth, tripController.createRequest);

// @route   POST api/trip/route
// @desc    Create/Update driver route
// @access  Private
router.post('/route', auth, tripController.createRoute);

// @route   GET api/trip/matches/:requestId
// @desc    Find matches for a request
// @access  Private
router.get('/matches/:requestId', auth, tripController.findMatches);

// @route   POST api/trip/confirm
// @desc    Confirm a trip
// @access  Private
router.post('/confirm', auth, tripController.confirmTrip);

module.exports = router;
