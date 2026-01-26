const express = require('express');
const router = express.Router();
const Car = require('../models/Car');

// TODO: specific middleware to check JWT token would go here
// const auth = require('../middleware/auth');

// @route   POST api/cars
// @desc    Add a new car
router.post('/', async (req, res) => {
    try {
        const { marque, model, year, color, places, isDefault, images, documents, ownerId } = req.body;

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
