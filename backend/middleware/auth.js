const jwt = require('jsonwebtoken');
const User = require('../models/User');



const auth = (req, res, next) => {
    let token = req.header('x-auth-token');
    if (!token && req.header('Authorization')) {
        const authHeader = req.header('Authorization');
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7);
        } else {
            token = authHeader;
        }
    }

    if (!token) {
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('FATAL: JWT_SECRET is not defined.');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (e) {
        res.status(401).json({ msg: 'Token is not valid' });
    }
};

const protect = auth;

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || (roles.length > 0 && !roles.includes(req.user.role))) {
            return res.status(403).json({ msg: 'Access forbidden: insufficient permissions' });
        }
        next();
    };
};

const requireVerification = async (req, res, next) => {
    try {
        // If user is client, they don't need verification (per current logic, or maybe they do? prompt implies driver restriction)
        // Request specifically says "if the user role is driver allow him only to access..."

        if (req.user.role === 'driver') {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ msg: 'User not found' });
            }

            if (user.verificationStatus !== 'verified') {
                return res.status(403).json({ success: false, error: 'Driver not verified. Access restricted.' });
            }
        }
        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const authAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ msg: 'Admin access required' });
        }
        next();
    } catch (err) {
        /* console.error(err.message); */
        res.status(500).send('Server Error');
    }
};

/**
 * Transactional Authorization Guard (DEC-LC-003):
 * Enforces that only verified, active users can execute transactional mutations
 * (booking, ride requests, offers, financial operations).
 * Guests and unverified users may browse and search, but cannot transact.
 */
const requireVerifiedTransactionalUser = async (req, res, next) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ success: false, code: 'UNAUTHORIZED', msg: 'Authentication required' });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, code: 'USER_NOT_FOUND', msg: 'User not found' });
        }

        // 1. Account status check (suspended / blocked / deleted)
        if (user.accountStatus && user.accountStatus !== 'active') {
            return res.status(403).json({
                success: false,
                code: 'ACCOUNT_RESTRICTED',
                msg: `Account is ${user.accountStatus}. Transactional actions forbidden.`
            });
        }

        // 2. Guest restriction check
        if (user.authProvider === 'guest') {
            return res.status(403).json({
                success: false,
                code: 'GUEST_RESTRICTED',
                msg: 'Guest accounts cannot perform transactional actions. Please complete registration and phone verification.'
            });
        }

        // 3. Mandatory phone verification
        if (!user.phoneVerified) {
            return res.status(403).json({
                success: false,
                code: 'PHONE_VERIFICATION_REQUIRED',
                msg: 'Phone number verification is required before initiating bookings, offers, or financial transactions.'
            });
        }

        // 4. Role-specific driver verification check
        if (user.role === 'driver' && user.verificationStatus !== 'verified') {
            return res.status(403).json({
                success: false,
                code: 'DRIVER_VERIFICATION_REQUIRED',
                msg: 'Driver KYC documents must be approved before performing driver transactions.'
            });
        }

        req.fullUser = user;
        next();
    } catch (err) {
        console.error('requireVerifiedTransactionalUser error:', err.message);
        res.status(500).json({ success: false, msg: 'Server Error during transactional authorization' });
    }
};

module.exports = { auth, protect, authorize, requireVerification, authAdmin, requireVerifiedTransactionalUser };
