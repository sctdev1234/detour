const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const placeController = require('../controllers/placeController');

// @route   GET api/places
// @desc    Get all saved places for user
router.get('/', auth, (req, res) => placeController.getPlaces(req, res));

// @route   POST api/places
// @desc    Add a new saved place
router.post('/', auth, (req, res) => placeController.addPlace(req, res));

// @route   DELETE api/places/:id
// @desc    Delete a saved place
router.delete('/:id', auth, (req, res) => placeController.deletePlace(req, res));

module.exports = router;
