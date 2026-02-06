const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_123';

// @route   POST api/auth/signup
// @desc    Register new user
router.post('/signup', async (req, res) => {
    const { email, password, fullName, role, photoURL } = req.body;
    console.log('--------------------------------------------------');
    console.log('[SIGNUP ATTEMPT]', { email, fullName, role });

    if (!email || !password || !fullName) {
        console.log('[SIGNUP ERROR] Missing fields:', { email: !!email, password: !!password, fullName: !!fullName });
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        user = new User({
            email,
            password,
            fullName,
            role: role || 'client',
            photoURL
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create Token
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: 3600 * 24 * 7 }, // 7 days
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role,
                        verificationStatus: user.verificationStatus,
                        photoURL: user.photoURL
                    }
                });
            }
        );
    } catch (err) {
        console.error('[SIGNUP EXCEPTION]', err.message);
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('--------------------------------------------------');
    console.log('[LOGIN ATTEMPT]', { email });

    if (!email || !password) {
        console.log('[LOGIN ERROR] Missing fields');
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        let user = await User.findOne({ email });
        if (!user) {
            console.log('[LOGIN ERROR] User not found:', email);
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials' });
        }

        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: 3600 * 24 * 7 }, // 7 days
            (err, token) => {
                if (err) throw err;
                res.json({
                    token,
                    user: {
                        id: user.id,
                        fullName: user.fullName,
                        email: user.email,
                        role: user.role,
                        verificationStatus: user.verificationStatus
                    }
                });
            }
        );
    } catch (err) {
        console.error('[LOGIN EXCEPTION]', err.message);
        console.error(err);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/auth/forgot-password
// @desc    Generate password reset token
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Generate token (simple random hex for now)
        const crypto = require('crypto');
        const token = crypto.randomBytes(20).toString('hex');

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();

        // In a real app, send email here.
        // For dev, return the token directly.
        res.json({ msg: 'Reset link sent (simulated)', token });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/auth/reset-password
// @desc    Reset password
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;
    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ msg: 'Password reset token is invalid or has expired' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        res.json({ msg: 'Password has been updated' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});


// @desc    Update user profile
router.put('/update', auth, async (req, res) => {
    const { fullName, photoURL } = req.body;
    const updateFields = {};
    if (fullName) updateFields.fullName = fullName;
    if (photoURL) updateFields.photoURL = photoURL;

    try {
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        user = await User.findByIdAndUpdate(
            req.user.id,
            { $set: updateFields },
            { new: true }
        ).select('-password');

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   POST api/auth/verify
// @desc    Submit verification documents
router.post('/verify', auth, async (req, res) => {
    const { cinFront, cinBack, license, carRegistration, facePhoto } = req.body;

    try {
        let user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ msg: 'User not found' });

        // Add to documents history
        user.documents.push({
            cinFront,
            cinBack,
            license,
            carRegistration,
            facePhoto
        });

        // Set status to pending
        user.verificationStatus = 'pending';

        await user.save();

        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   GET api/auth/me
// @desc    Get current user
router.get('/me', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

// @route   DELETE api/auth/delete
// @desc    Delete user account
router.delete('/delete', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        await User.findByIdAndDelete(req.user.id);
        res.json({ msg: 'User deleted' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server Error' });
    }
});

module.exports = router;
