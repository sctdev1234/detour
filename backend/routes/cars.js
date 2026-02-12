const express = require('express');
const router = express.Router();
const Car = require('../models/Car');

const { auth, requireVerification } = require('../middleware/auth');

// @route   POST api/cars
// @desc    Add a new car
router.post('/', auth, requireVerification, async (req, res) => {
    try {
        let { marque, model, year, color, places, isDefault, images, documents, ownerId } = req.body;

        // Check if user has any cars
        const existingCarsCount = await Car.countDocuments({ ownerId });

        // If it's the first car, force it to be default
        if (existingCarsCount === 0) {
            isDefault = true;
        }

        // If this car is set as default (either by user or forced), unset others
        if (isDefault) {
            await Car.updateMany({ ownerId }, { isDefault: false });
        }

        const newCar = new Car({
            marque,
            model,
            year,
            color,
            places,
            isDefault,
            images,
            documents,
            ownerId: ownerId // In real app, get this from req.user.id via auth middleware
        });

        const car = await newCar.save();
        res.json(car);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/cars
// @desc    Get all cars for a user (query param ownerId)
router.get('/', async (req, res) => {
    try {
        const { ownerId } = req.query;
        let query = {};
        if (ownerId) {
            query.ownerId = ownerId;
        }

        const cars = await Car.find(query).sort({ date: -1 });
        res.json(cars);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
