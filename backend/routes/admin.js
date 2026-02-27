const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Place = require('../models/Place');
const Subscription = require('../models/Subscription');
const Coupon = require('../models/Coupon');
const Withdrawal = require('../models/Withdrawal');
const Car = require('../models/Car');
const Review = require('../models/Review');
const bcrypt = require('bcryptjs');
const { auth } = require('../middleware/auth');

// Middleware to verify if user is admin
const adminCheck = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied: Admins only' });
    }
    next();
};

// @route   GET api/admin/pending-drivers
// @desc    Get all drivers with pending verification
// @access  Admin
router.get('/pending-drivers', auth, adminCheck, async (req, res) => {
    try {
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
router.post('/verify-driver/:id', auth, adminCheck, async (req, res) => {
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
router.post('/reject-driver/:id', auth, adminCheck, async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.verificationStatus = 'rejected';
        await user.save();
        res.json({ msg: 'Driver rejected', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/admin/users
// @desc    Get all users (with optional role and verification filter, and pagination)
// @access  Admin
router.get('/users', auth, adminCheck, async (req, res) => {
    try {
        const { role, verificationStatus, page = 1, limit = 10 } = req.query;
        let query = {};

        if (role && role !== 'all') {
            query.role = role;
        }

        if (verificationStatus && verificationStatus !== 'all') {
            // 'verified' matches 'verified'
            // 'unverified' matches 'unverified'
            // 'pending' matches 'pending' (though these are usually in driver queue)
            // 'rejected' (banned) matches 'rejected'
            query.verificationStatus = verificationStatus;
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const totalUsers = await User.countDocuments(query);
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.json({
            users,
            totalPages: Math.ceil(totalUsers / limitNum),
            currentPage: pageNum,
            totalUsers
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/users
// @desc    Create a new user (Admin/Support/Client/Driver)
// @access  Admin
router.post('/users', auth, adminCheck, async (req, res) => {
    const { fullName, email, password, role, phone } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            fullName,
            email,
            role: role || 'client',
            // verificationStatus defaults to 'unverified'
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Return user without password
        const userObj = user.toObject();
        delete userObj.password;

        res.json(userObj);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT api/admin/users/:id
// @desc    Update a user
// @access  Admin
router.put('/users/:id', auth, adminCheck, async (req, res) => {
    const { fullName, email, role, phone } = req.body;
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        if (fullName) user.fullName = fullName;
        if (email) user.email = email; // Note: Typically should check if email is taken by another user
        if (role) user.role = role;
        // if (phone) user.phone = phone; // Add phone if model supports it

        await user.save();
        const userObj = user.toObject();
        delete userObj.password;

        res.json(userObj);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/admin/users/:id
// @desc    Delete a user
// @access  Admin
router.delete('/users/:id', auth, adminCheck, async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        await user.deleteOne();
        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});


// @route   POST api/admin/ban-user/:id
// @desc    Ban a user
// @access  Admin
router.post('/ban-user/:id', auth, adminCheck, async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user.verificationStatus = 'rejected';
        await user.save();
        res.json({ msg: 'User has been banned', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/unban-user/:id
// @desc    Unban a user
// @access  Admin
router.post('/unban-user/:id', auth, adminCheck, async (req, res) => {
    try {
        let user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Restore status based on role or default
        if (user.role === 'driver') {
            // If they were verified before, maybe 'verified'? 
            // Safer to set to 'unverified' or 'pending' if we want them to re-verify?
            // Or 'verified' if we trust the unban action.
            // Let's set to 'verified' for convenience, or 'unverified' if no docs?
            // Simplest: 'verified' if documents exist, or 'unverified'.
            // For now, let's set to 'unverified' to be safe, or 'verified'.
            // The user asked to "unban". Usually means restore access.
            user.verificationStatus = 'verified';
        } else {
            user.verificationStatus = 'unverified'; // Default for clients
        }

        await user.save();
        res.json({ msg: 'User has been unbanned', user });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/admin/places
// @desc    Get all places
// @access  Admin
router.get('/places', auth, adminCheck, async (req, res) => {
    try {
        console.log('GET /places params:', req.query);
        const { page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        if (isNaN(pageNum) || isNaN(limitNum)) {
            return res.status(400).json({ msg: 'Invalid page or limit' });
        }

        const skip = (pageNum - 1) * limitNum;
        console.log(`Pagination: page=${pageNum}, limit=${limitNum}, skip=${skip}`);

        const totalPlaces = await Place.countDocuments();
        const places = await Place.find()
            .populate('user', 'fullName email photoURL phone role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.json({
            places,
            totalPages: Math.ceil(totalPlaces / limitNum),
            currentPage: pageNum,
            totalPlaces
        });
    } catch (err) {
        console.error('Error in GET /places:', err);
        console.error(err.stack);
        res.status(500).json({ msg: 'Server Error', error: err.message });
    }
});

// @route   POST api/admin/places
// @desc    Add a new place
// @access  Admin
router.post('/places', auth, adminCheck, async (req, res) => {
    try {
        const { name, address, category, latitude, longitude } = req.body;

        const placeData = {
            label: name, // Map name to label
            name, // Keep name too if model allows, for consistency
            address,
            category,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            user: req.user.id
        };

        const newPlace = new Place(placeData);
        const place = await newPlace.save();

        // Populate user before sending back
        const populatedPlace = await Place.findById(place._id).populate('user', 'fullName email photoURL phone role');

        res.json(populatedPlace);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/admin/places/:id
// @desc    Delete a place
// @access  Admin
router.delete('/places/:id', auth, adminCheck, async (req, res) => {
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
router.get('/subscriptions', auth, adminCheck, async (req, res) => {
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
router.post('/subscriptions', auth, adminCheck, async (req, res) => {
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
router.delete('/subscriptions/:id', auth, adminCheck, async (req, res) => {
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
router.get('/coupons', auth, adminCheck, async (req, res) => {
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
router.post('/coupons', auth, adminCheck, async (req, res) => {
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
router.delete('/coupons/:id', auth, adminCheck, async (req, res) => {
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
router.get('/withdrawals', auth, adminCheck, async (req, res) => {
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
router.post('/withdrawals/:id/:action', auth, adminCheck, async (req, res) => {
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
router.get('/stats', auth, adminCheck, async (req, res) => {
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
router.get('/trips', auth, adminCheck, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const Trip = require('../models/Trip');

        let query = {};
        if (status && status !== 'all') {
            query.status = status;
        }

        const totalTrips = await Trip.countDocuments(query);
        const trips = await Trip.find(query)
            .populate('driverId', 'fullName email')
            .populate('routeId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.json({
            trips,
            totalPages: Math.ceil(totalTrips / limitNum),
            currentPage: pageNum,
            totalTrips
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});


// @route   GET api/admin/cars
// @desc    Get all cars (with pagination and filtering)
// @access  Admin
router.get('/cars', auth, adminCheck, async (req, res) => {
    try {
        const { page = 1, limit = 10, verificationStatus, search } = req.query;
        let query = {};

        if (verificationStatus && verificationStatus !== 'all') {
            query.verificationStatus = verificationStatus;
        }

        if (search) {
            query.$or = [
                { marque: { $regex: search, $options: 'i' } },
                { model: { $regex: search, $options: 'i' } }
            ];
        }

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        const totalCars = await Car.countDocuments(query);
        const cars = await Car.find(query)
            .populate('ownerId', 'fullName email phone photoURL')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        res.json({
            cars,
            totalPages: Math.ceil(totalCars / limitNum),
            currentPage: pageNum,
            totalCars
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/cars/:id/verify
// @desc    Approve/verify a car
// @access  Admin
router.post('/cars/:id/verify', auth, adminCheck, async (req, res) => {
    try {
        let car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ msg: 'Car not found' });

        car.verificationStatus = 'verified';
        await car.save();
        res.json({ msg: 'Car verified successfully', car });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/cars/:id/reject
// @desc    Reject a car verification
// @access  Admin
router.post('/cars/:id/reject', auth, adminCheck, async (req, res) => {
    try {
        let car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ msg: 'Car not found' });

        car.verificationStatus = 'rejected';
        await car.save();
        res.json({ msg: 'Car rejected', car });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/admin/cars/:id
// @desc    Delete a car
// @access  Admin
router.delete('/cars/:id', auth, adminCheck, async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ msg: 'Car not found' });

        await car.deleteOne();
        res.json({ msg: 'Car removed successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/admin/cars
// @desc    Create a new car by admin
// @access  Admin
router.post('/cars', auth, adminCheck, async (req, res) => {
    try {
        const { marque, model, year, color, places, ownerId, images } = req.body;

        let targetOwnerId = ownerId;
        if (!targetOwnerId) {
            targetOwnerId = req.user.id;
        }

        const newCar = new Car({
            marque,
            model,
            year,
            color,
            places,
            images,
            ownerId: targetOwnerId,
            verificationStatus: 'verified' // Admins creating it so it can bypass verification
        });

        const car = await newCar.save();
        res.json(car);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   PUT api/admin/cars/:id
// @desc    Update a car by admin
// @access  Admin
router.put('/cars/:id', auth, adminCheck, async (req, res) => {
    try {
        const { marque, model, year, color, places, ownerId, images } = req.body;

        let car = await Car.findById(req.params.id);
        if (!car) return res.status(404).json({ msg: 'Car not found' });

        if (marque) car.marque = marque;
        if (model) car.model = model;
        if (year) car.year = year;
        if (color) car.color = color;
        if (places) car.places = places;
        if (ownerId) car.ownerId = ownerId;
        if (images) car.images = images;

        await car.save();

        const updatedCar = await Car.findById(req.params.id).populate('ownerId', 'fullName email phone');
        res.json(updatedCar);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// ==========================================
// REVIEWS MANAGEMENT
// ==========================================

// @route   GET /api/admin/reviews/users
// @desc    Get all users who have given or received reviews, with counts
// @access  Admin
router.get('/reviews/users', auth, adminCheck, async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '', role = 'all' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        // Perform an aggregation to get users who are either reviewers or reviewees
        // and count their related reviews.
        // We'll use a facet to get total counts and paginated results in one query.
        const pipeline = [
            // 1. Group by reviewerId to get reviews given
            {
                $group: {
                    _id: "$reviewerId",
                    givenCount: { $sum: 1 }
                }
            },
            // Combine with reviewees (this is tricky in one go, so we'll do an alternative approach)
        ];

        // Alternative approach: Find unique users involved in reviews, then aggregate their stats
        // This is easier to implement robustly without complex full-collection facets if the DB isn't huge.
        const uniqueUserIds = await Review.distinct('reviewerId');
        const uniqueReviewees = await Review.distinct('revieweeId');

        // Combine and deduplicate
        const allInvolvedUserIds = [...new Set([...uniqueUserIds.map(id => id.toString()), ...uniqueReviewees.map(id => id.toString())])];

        // Fetch user data for these IDs
        let query = { _id: { $in: allInvolvedUserIds } };

        if (role !== 'all') {
            query.role = role;
        }

        if (search) {
            query.$or = [
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const totalUsers = await User.countDocuments(query);
        const users = await User.find(query)
            .select('fullName email role photoURL')
            .skip(skip)
            .limit(limitNum)
            .lean();

        // Now, for the paginated users, attach their review counts
        const enrichedUsers = await Promise.all(users.map(async (user) => {
            const givenCount = await Review.countDocuments({ reviewerId: user._id });
            const receivedCount = await Review.countDocuments({ revieweeId: user._id });

            // Calculate average rating received
            const receivedReviews = await Review.find({ revieweeId: user._id }).select('rating');
            let avgRatingReceived = 0;
            if (receivedReviews.length > 0) {
                const sum = receivedReviews.reduce((acc, rev) => acc + rev.rating, 0);
                avgRatingReceived = sum / receivedReviews.length;
            }

            return {
                ...user,
                stats: {
                    givenCount,
                    receivedCount,
                    avgRatingReceived: Number(avgRatingReceived.toFixed(1))
                }
            };
        }));

        res.json({
            users: enrichedUsers,
            totalPages: Math.ceil(totalUsers / limitNum),
            currentPage: pageNum,
            totalUsers
        });

    } catch (err) {
        console.error("Error fetching grouped reviewers:", err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET /api/admin/reviews/user/:userId
// @desc    Get detailed reviews given and received by a specific user
// @access  Admin
router.get('/reviews/user/:userId', auth, adminCheck, async (req, res) => {
    try {
        const { userId } = req.params;

        const targetUser = await User.findById(userId).select('fullName email role photoURL');
        if (!targetUser) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Fetch reviews where this user is the reviewer (Given)
        const reviewsGiven = await Review.find({ reviewerId: userId })
            .populate('revieweeId', 'fullName email')
            .populate('tripId')
            .sort({ createdAt: -1 })
            .lean();

        // Fetch reviews where this user is the reviewee (Received)
        const reviewsReceived = await Review.find({ revieweeId: userId })
            .populate('reviewerId', 'fullName email')
            .populate('tripId')
            .sort({ createdAt: -1 })
            .lean();

        res.json({
            user: targetUser,
            reviewsGiven,
            reviewsReceived
        });
    } catch (err) {
        console.error("Error fetching user detailed reviews:", err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE /api/admin/reviews/:id
// @desc    Delete a review
// @access  Admin
router.delete('/reviews/:id', auth, adminCheck, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ msg: 'Review not found' });
        }

        await review.deleteOne();
        res.json({ msg: 'Review removed successfully' });
    } catch (err) {
        console.error("Error deleting review:", err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Review not found' });
        }
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
