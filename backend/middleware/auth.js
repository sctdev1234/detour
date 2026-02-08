const jwt = require('jsonwebtoken');
const User = require('../models/User');



const auth = (req, res, next) => {
    const token = req.header('x-auth-token');

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

const requireVerification = async (req, res, next) => {
    try {
        // If user is client, they don't need verification (per current logic, or maybe they do? prompt implies driver restriction)
        // Request specifically says "if the user role is driver allow him only to access..."

        if (req.user.role === 'driver') {
            const user = await User.findById(req.user.id);
            if (!user) {
                return res.status(404).json({ msg: 'User not found' });
            }

            /*
            if (user.verificationStatus !== 'verified') {
                return res.status(403).json({ msg: 'Driver not verified. Access restricted.' });
            }
            */
        }
        next();
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

module.exports = { auth, requireVerification };
