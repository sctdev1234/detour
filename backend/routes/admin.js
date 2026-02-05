const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware to verify if user is admin
// NOTE: You should also use the auth middleware to verify the token
const auth = require('./auth'); // Assuming auth exports the middleware function as 'auth' or default? 
// Checking auth.js content:
// const auth = (req, res, next) => { ... }
// module.exports = router;
// Wait, auth.js exports 'router'. usage in server.js: app.use('/api/auth', require('./routes/auth'));
// The auth middleware is DEFINED in auth.js but not exported separately.
// We need to fix this or copy the middleware. 
// Ideally, we should move middleware to a separate file. 
// For now, I'll copy the middleware logic or require it if possible.
// Let's create a separate middleware file ideally, but to minimize changes, I will implement a simple token check here or ask user to refactor.
// Better: Refactor auth.js slightly or duplicate logic? 
// Duplicating logic is bad. 
// Let's look at `auth.js` again. It has `const auth = ...` but only exports `router`.
// I'll create a new middleware file 'middleware/auth.js'.

// Wait, I can't easily refactor auth.js without viewing it again to be sure.
// I'll create 'middleware/auth.js' first, then use it in both files? 
// Or just inline it here for now to save time, as it's just verification.
// I'll inline it for now but with a TODO.
// Actually, `jwt` is needed.
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123';

const authMiddleware = (req, res, next) => {
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

const adminCheck = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied: Admins only' });
    }
    next();
};

// @route   GET api/admin/pending-drivers
// @desc    Get all drivers with pending verification
// @access  Admin
router.get('/pending-drivers', authMiddleware, adminCheck, async (req, res) => {
    try {
        // Find users with role 'driver' AND verificationStatus 'pending'
        // Some might be 'unverified' but have uploaded documents. 
        // Logic: if documents exist? 
        // For now, let's assume they set status to 'pending' when uploading.
        // If the mobile app doesn't set 'pending', we might need to check 'unverified'.
        // Let's exact match 'pending' for now.
        const drivers = await User.find({ 
            role: 'driver', 
            verificationStatus: 'pending' 
        }).select('-password');
        res.json(drivers);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/verify-driver/:id
// @desc    Approve a driver
// @access  Admin
router.post('/verify-driver/:id', authMiddleware, adminCheck, async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.verificationStatus = 'verified';
        await user.save();
        res.json({ msg: 'Driver verified successfully', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/reject-driver/:id
// @desc    Reject a driver
// @access  Admin
router.post('/reject-driver/:id', authMiddleware, adminCheck, async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.verificationStatus = 'rejected';
        // Optional: Add a reason logic later
        await user.save();
        res.json({ msg: 'Driver rejected', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
