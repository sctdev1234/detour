const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to verify token (reuse from auth.js or extract to middleware file)
// For now, I'll assume we can use the same middleware logic or import it if I extracted it.
// I'll quickly extract it in the next step, but for now let's write it inline or assume passed.
// Actually, best practice is to extract it. I will extract `auth` middleware in `server.js` or `middleware/auth.js`.
// Let's create a middleware file first? No, I'll create this file and then fix middleware.

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123';

const auth = (req, res, next) => {
    const token = req.header('x-auth-token');
    if (!token) return res.status(401).json({ msg: 'No token, authorization denied' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

// @route   POST api/tracking/update
// @desc    Update current user's location
router.post('/update', auth, async (req, res) => {
    const { latitude, longitude, heading, speed } = req.body;

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.location = {
            latitude,
            longitude,
            heading,
            speed,
            timestamp: Date.now(),
            updatedAt: Date.now()
        };

        await user.save();
        res.json(user.location);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/tracking/:id
// @desc    Get a specific user's location (Driver)
router.get('/:id', auth, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('location fullName vehicle');
        if (!user) return res.status(404).json({ msg: 'User not found' });

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
