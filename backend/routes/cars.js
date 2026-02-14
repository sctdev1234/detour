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
// @desc    Get all cars for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const cars = await Car.find({ ownerId: req.user.id }).sort({ date: -1 });
        res.json(cars);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PATCH api/cars/:id
// @desc    Update a car (partial update)
router.patch('/:id', auth, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ msg: 'Car not found' });
        }

        // If setting this car as default, unset all others first
        if (req.body.isDefault) {
            await Car.updateMany({ ownerId: car.ownerId }, { isDefault: false });
        }

        const updatedCar = await Car.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true }
        );

        res.json(updatedCar);
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Car not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   DELETE api/cars/:id
// @desc    Delete a car
router.delete('/:id', auth, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ msg: 'Car not found' });
        }

        const wasDefault = car.isDefault;
        const ownerId = car.ownerId;

        await Car.findByIdAndDelete(req.params.id);

        // If the deleted car was the default, promote the next one
        if (wasDefault) {
            const nextCar = await Car.findOne({ ownerId }).sort({ createdAt: -1 });
            if (nextCar) {
                nextCar.isDefault = true;
                await nextCar.save();
            }
        }

        res.json({ msg: 'Car removed' });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Car not found' });
        }
        res.status(500).send('Server Error');
    }
});

module.exports = router;
