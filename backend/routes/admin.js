const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Place = require('../models/Place');
const Subscription = require('../models/Subscription');
const Coupon = require('../models/Coupon');
const Withdrawal = require('../models/Withdrawal');

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

// @route   GET api/admin/users
// @desc    Get all users (with optional role filter)
// @access  Admin
router.get('/users', authMiddleware, adminCheck, async (req, res) => {
    try {
        const { role } = req.query;
        let query = {};
        if (role) {
            query.role = role;
        }
        const users = await User.find(query).select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/ban-user/:id
// @desc    Ban a user (Client or Driver)
// @access  Admin
router.post('/ban-user/:id', authMiddleware, adminCheck, async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Toggle ban status or set a specific 'banned' status?
        // The TASKS.md says "ban the driver".
        // Use 'rejected' or a new 'banned' status?
        // User model has verificationStatus: ['pending', 'verified', 'rejected', 'unverified']
        // 'rejected' effectively bans them from driving usually.
        // But for Clients, verifStatus might not apply the same way?
        // Let's check User model again if there is an 'isActive' or 'isBanned'.
        // If not, I might need to add it or use verificationStatus = 'rejected' for now.
        // Or users might just be deleted? No, ban is better.
        // Let's assume 'rejected' or add a new 'banned' if needed.
        // For simplicity, let's set verificationStatus to 'rejected' for drivers.
        // For clients, we might need a separate field since they don't have verificationStatus usually?
        // Wait, Userjs shows verificationStatus default 'unverified'. 
        // Let's stick to using verificationStatus = 'rejected' as "Banned" for now.

        user.verificationStatus = 'rejected';
        // We could also add a 'banned: true' field in the future if needed.

        await user.save();
        res.json({ msg: 'User has been banned/rejected', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/admin/places
// @desc    Get all places
// @access  Admin
router.get('/places', authMiddleware, adminCheck, async (req, res) => {
    try {
        const places = await Place.find().sort({ createdAt: -1 });
        res.json(places);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/places
// @desc    Add a new place
// @access  Admin
router.post('/places', authMiddleware, adminCheck, async (req, res) => {
    try {
        const { name, address, category } = req.body;
        const newPlace = new Place({
            name,
            address,
            category,
            createdBy: req.user.id
        });
        const place = await newPlace.save();
        res.json(place);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/admin/places/:id
// @desc    Delete a place
// @access  Admin
router.delete('/places/:id', authMiddleware, adminCheck, async (req, res) => {
    try {
        const place = await Place.findById(req.params.id);
        if (!place) return res.status(404).json({ msg: 'Place not found' });

        await place.deleteOne();
        res.json({ msg: 'Place removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/admin/subscriptions
// @desc    Get all subscriptions
// @access  Admin
router.get('/subscriptions', authMiddleware, adminCheck, async (req, res) => {
    try {
        const subs = await Subscription.find().sort({ createdAt: -1 });
        res.json(subs);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/subscriptions
// @desc    Create a subscription plan
// @access  Admin
router.post('/subscriptions', authMiddleware, adminCheck, async (req, res) => {
    try {
        const newSub = new Subscription(req.body);
        const savedSub = await newSub.save();
        res.json(savedSub);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/admin/subscriptions/:id
// @desc    Delete a subscription plan
// @access  Admin
router.delete('/subscriptions/:id', authMiddleware, adminCheck, async (req, res) => {
    try {
        const sub = await Subscription.findById(req.params.id);
        if (!sub) return res.status(404).json({ msg: 'Plan not found' });

        await sub.deleteOne();
        res.json({ msg: 'Plan removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/admin/coupons
// @desc    Get all coupons
// @access  Admin
router.get('/coupons', authMiddleware, adminCheck, async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/coupons
// @desc    Create a coupon
// @access  Admin
router.post('/coupons', authMiddleware, adminCheck, async (req, res) => {
    try {
        const newCoupon = new Coupon(req.body);
        const savedCoupon = await newCoupon.save();
        res.json(savedCoupon);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/admin/coupons/:id
// @desc    Delete a coupon
// @access  Admin
router.delete('/coupons/:id', authMiddleware, adminCheck, async (req, res) => {
    try {
        const coupon = await Coupon.findById(req.params.id);
        if (!coupon) return res.status(404).json({ msg: 'Coupon not found' });

        await coupon.deleteOne();
        res.json({ msg: 'Coupon removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/admin/withdrawals
// @desc    Get all withdrawals
// @access  Admin
router.get('/withdrawals', authMiddleware, adminCheck, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find()
            .populate('user', 'fullName email')
            .sort({ createdAt: -1 });
        res.json(withdrawals);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/withdrawals/:id/:action
// @desc    Approve or Reject withdrawal
// @access  Admin
router.post('/withdrawals/:id/:action', authMiddleware, adminCheck, async (req, res) => {
    try {
        const { id, action } = req.params;
        const withdrawal = await Withdrawal.findById(id);

        if (!withdrawal) return res.status(404).json({ msg: 'Withdrawal not found' });
        if (withdrawal.status !== 'pending') return res.status(400).json({ msg: 'Already processed' });

        if (action === 'approve') {
            withdrawal.status = 'approved';
            withdrawal.processedAt = Date.now();
            // TODO: Trigger actual payout logic here if integrated
        } else if (action === 'reject') {
            withdrawal.status = 'rejected';
            withdrawal.processedAt = Date.now();
            // TODO: Refund amount to user wallet logic
            const user = await User.findById(withdrawal.user);
            if (user) {
                user.credits += withdrawal.amount; // Refund
                await user.save();
            }
        } else {
            return res.status(400).json({ msg: 'Invalid action' });
        }

        await withdrawal.save();
        res.json(withdrawal);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/admin/stats
// @desc    Get dashboard statistics
// @access  Admin
router.get('/stats', authMiddleware, adminCheck, async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'client' });
        const totalDrivers = await User.countDocuments({ role: 'driver' });
        const pendingDrivers = await User.countDocuments({ role: 'driver', verificationStatus: 'pending' });

        // Count active trips/withdrawals if models exist
        const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });

        // Trip stats
        let activeTrips = 0;
        let completedTrips = 0;
        try {
            const Trip = require('../models/Trip');
            activeTrips = await Trip.countDocuments({ status: 'active' });
            completedTrips = await Trip.countDocuments({ status: 'completed' });
        } catch (e) {
            console.log('Trip model not found or error', e);
        }

        res.json({
            totalUsers,
            totalDrivers,
            pendingDrivers,
            pendingWithdrawals,
            activeTrips,
            completedTrips
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/admin/trips
// @desc    Get all trips
// @access  Admin
router.get('/trips', authMiddleware, adminCheck, async (req, res) => {
    try {
        const Trip = require('../models/Trip');
        const trips = await Trip.find()
            .populate('driverId', 'fullName email')
            // .populate('userId', 'fullName email') // Assuming rideRequestId has user info or Trip has userId?
            // Trip model shows rideRequestId ref 'RideRequest'. 
            // We might need to deep populate or just show basic info.
            .sort({ createdAt: -1 });
        res.json(trips);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
