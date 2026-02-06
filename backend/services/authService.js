const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

class AuthService {
    async signup({ email, password, fullName, role, photoURL }) {
        let user = await User.findOne({ email });
        if (user) {
            throw new Error('User already exists');
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

        const token = this.generateToken(user);

        return { user, token };
    }

    async login({ email, password }) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid Credentials');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid Credentials');
        }

        const token = this.generateToken(user);
        return { user, token };
    }

    async forgotPassword({ email }) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('User not found');
        }

        const crypto = require('crypto');
        const token = crypto.randomBytes(20).toString('hex');

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();
        return { token };
    }

    async resetPassword({ token, newPassword }) {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            throw new Error('Password reset token is invalid or has expired');
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();
        return true;
    }

    async updateProfile(userId, { fullName, photoURL }) {
        const updateFields = {};
        if (fullName) updateFields.fullName = fullName;
        if (photoURL) updateFields.photoURL = photoURL;

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true }
        ).select('-password');

        if (!user) throw new Error('User not found');
        return user;
    }

    async verifyDriver(userId, documents) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        user.documents.push(documents);
        user.verificationStatus = 'pending';

        await user.save();
        return user;
    }

    async deleteAccount(userId) {
        const user = await User.findByIdAndDelete(userId);
        if (!user) throw new Error('User not found');
        return true;
    }

    async changePassword(userId, { oldPassword, newPassword }) {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            throw new Error('Invalid current password');
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);

        await user.save();
        return true;
    }

    generateToken(user) {
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        return jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );
    }
}

module.exports = new AuthService();
