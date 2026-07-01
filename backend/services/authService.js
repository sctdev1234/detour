const { AppError } = require('../utils/errors');
const userRepository = require('../repositories/UserRepository');
const { SavedPlaceRepository } = require('../repositories/PlaceRepository');
const routeRepository = require('../repositories/RouteRepository');
const carRepository = require('../repositories/CarRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const fs = require('fs');

class AuthService {
    async signup({ email, password, fullName, role, photoURL, phone }) {
        let user = await userRepository.findByEmail(email);
        if (user) {
            throw new AppError('User already exists', 400);
        }
        if (phone) {
            let userByPhone = await userRepository.findOne({ phone });
            if (userByPhone) throw new AppError('Phone number already in use', 400);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        user = await userRepository.create({
            email,
            password: hashedPassword,
            fullName,
            role: role || 'client',
            photoURL,
            phone,
            phoneVerified: false
        });

        const { accessToken, refreshToken } = this.generateTokens(user);
        user.refreshToken = refreshToken;

        // Generate OTP if phone is provided
        if (phone) {
            await this.sendOTP(user);
        } else {
            await user.save();
        }

        const onboardingStatus = await this.calculateOnboardingStatus(user);
        const userObj = user.toObject();
        userObj.onboardingStatus = onboardingStatus;

        return { user: userObj, token: accessToken, refreshToken };

    }

    async sendOTP(user) {
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        user.otpCode = otpCode;
        user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
        await user.save();

        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER && user.phone) {
            const twilio = require('twilio');
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            try {
                await client.messages.create({
                    body: `Your Detour verification code is: ${otpCode}`,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: user.phone
                });
                console.log(`[Twilio] Sent OTP ${otpCode} to ${user.phone}`);
            } catch (err) {
                console.error('[Twilio] Failed to send OTP:', err.message);
            }
        } else {
            console.log(`[Mock SMS] OTP for ${user.phone || user.email} is: ${otpCode}`);
        }
    }

    async verifyOTP(userId, code) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);
        if (user.phoneVerified) throw new AppError('Phone already verified', 400);
        
        if (!user.otpCode || user.otpCode !== code) {
            throw new AppError('Invalid OTP code', 400);
        }
        if (user.otpExpiresAt < new Date()) {
            throw new AppError('OTP code expired', 400);
        }

        user.phoneVerified = true;
        user.otpCode = undefined;
        user.otpExpiresAt = undefined;
        
        // If client, mark them verified immediately. Drivers still need manual verification.
        if (user.role === 'client') {
            user.verificationStatus = 'verified';
        }

        await user.save();
        return user;
    }

    async resendOTP(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);
        if (user.phoneVerified) throw new AppError('Phone already verified', 400);
        
        await this.sendOTP(user);
        return { msg: 'OTP resent successfully' };
    }

    async login({ email, password }) {
        const user = await userRepository.findOne({ email });
        if (!user) {
            throw new AppError('Invalid Credentials', 401);
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new AppError('Invalid Credentials', 401);
        }

        // Fetch saved places
        const savedPlaces = await SavedPlaceRepository.find({ user: user.id });
        const userObj = user.toObject();
        userObj.savedPlaces = savedPlaces;
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        const { accessToken, refreshToken } = this.generateTokens(user);
        user.refreshToken = refreshToken;
        await user.save();

        return {
            token: accessToken,
            refreshToken,
            user: userObj
        };

    }

    async getUser(userId) {
        const user = await userRepository.findById(userId).select('-password');
        if (!user) return null;

        const savedPlaces = await SavedPlaceRepository.find({ user: userId });
        const userObj = user.toObject();
        userObj.id = user._id.toString(); // Ensure id is always present for frontend
        userObj.savedPlaces = savedPlaces;
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return userObj;

    }

    async forgotPassword({ email }) {
        const user = await userRepository.findOne({ email });
        if (!user) {
            throw new AppError('User not found', 404);
        }

        const crypto = require('crypto');
        const token = crypto.randomBytes(20).toString('hex');

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        await user.save();
        return { token };
    }

    async resetPassword({ token, newPassword }) {
        const user = await userRepository.findOne({
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

        async updateProfile(userId, updateData) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        if (updateData.fullName !== undefined) user.fullName = updateData.fullName;
        if (updateData.photoURL !== undefined) user.photoURL = updateData.photoURL;
        if (updateData.language !== undefined) user.language = updateData.language;
        if (updateData.preferences !== undefined) {
            user.preferences = { ...user.preferences, ...updateData.preferences };
        }

        await user.save();
        return user.toObject();
    }

    async verifyDriver(userId, documents) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        user.documents.push(documents);
        user.verificationStatus = 'pending';

        await user.save();

        const userObj = user.toObject();
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return userObj;

    }

        async deactivateAccount(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);
        user.accountStatus = 'deactivated';
        user.refreshToken = null;
        user.devices = [];
        await user.save();
        return true;
    }

    async deleteAccount(userId) {
        const user = await userRepository.hardDelete(userId);
        if (!user) throw new AppError('User not found', 404);
        return true;
    }

    async changePassword(userId, { oldPassword, newPassword }) {
        const user = await userRepository.findById(userId);
        if (!user) {
            throw new AppError('User not found', 404);
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

    // ...

    async addSavedPlace(userId, placeData) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);

        await SavedPlaceRepository.create({
            user: userId,
            ...placeData
        });

        // Return all saved places for the user to keep frontend state consistent
        return SavedPlaceRepository.find({ user: userId });
    }

    async removeSavedPlace(userId, placeId) {
        // Ensure the place belongs to the user
        const result = await SavedPlaceRepository.model.findOneAndDelete({ _id: placeId, user: userId });
        if (!result) throw new Error('Place not found or not authorized');

        // Return updated list
        return SavedPlaceRepository.find({ user: userId });
    }

    async getSavedPlaces(userId) {
        return SavedPlaceRepository.find({ user: userId });
    }

    
    async oauthLogin({ email, fullName, photoURL, provider, providerId }) {
        let user;
        if (provider === 'google') {
            user = await userRepository.findOne({ googleId: providerId });
        } else if (provider === 'apple') {
            user = await userRepository.findOne({ appleId: providerId });
        }

        if (!user && email) {
            user = await userRepository.findByEmail(email);
        }

        if (!user) {
            // Register new user
            const payload = {
                email,
                fullName,
                photoURL,
                authProvider: provider,
                role: 'client',
                verificationStatus: 'verified' // Assume OAuth emails are verified
            };
            if (provider === 'google') payload.googleId = providerId;
            if (provider === 'apple') payload.appleId = providerId;
            user = await userRepository.create(payload);
        } else {
            // Link existing user
            if (provider === 'google' && !user.googleId) {
                user.googleId = providerId;
            } else if (provider === 'apple' && !user.appleId) {
                user.appleId = providerId;
            }
            await user.save();
        }

        const { accessToken, refreshToken } = this.generateTokens(user);
        user.refreshToken = refreshToken;
        await user.save();

        const userObj = user.toObject();
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return { token: accessToken, refreshToken, user: userObj };
    }

    async guestLogin(deviceId) {
        let user = await userRepository.findOne({ guestId: deviceId });
        
        if (!user) {
            user = await userRepository.create({
                authProvider: 'guest',
                guestId: deviceId,
                role: 'client',
                verificationStatus: 'unverified'
            });
        }

        const { accessToken, refreshToken } = this.generateTokens(user);
        user.refreshToken = refreshToken;
        await user.save();

        return { token: accessToken, refreshToken, user: user.toObject() };
    }

    async logout(userId, deviceId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);
        
        // Remove device or clear refresh token
        user.refreshToken = null;
        if (deviceId) {
            user.devices = user.devices.filter(d => d.deviceId !== deviceId);
        }
        await user.save();
        return true;
    }

    async revokeAllTokens(userId) {
        const user = await userRepository.findById(userId);
        if (!user) throw new AppError('User not found', 404);
        user.refreshToken = null;
        user.devices = [];
        await user.save();
        return true;
    }

    generateTokens(user) {
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };

        const accessToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '15m' }
        );

        const refreshToken = jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        return { accessToken, refreshToken };
    }

    async refreshSession(refreshToken) {
        if (!refreshToken) throw new Error('No refresh token provided');

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
            const user = await userRepository.findById(decoded.user.id);
            
            if (!user || user.refreshToken !== refreshToken) {
                throw new Error('Invalid refresh token');
            }

            const tokens = this.generateTokens(user);
            user.refreshToken = tokens.refreshToken;
            await user.save();

            return tokens;
        } catch (err) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    async calculateOnboardingStatus(user) {
        const status = {
            completed: false,
            steps: []
        };

        const role = user.role ? user.role.toLowerCase() : 'client';

        if (role === 'client') {
            const routeCount = await routeRepository.count({ userId: user._id, role: 'client' });
            const hasRoute = routeCount > 0;

            const placesCount = await SavedPlaceRepository.count({ user: user._id });
            const hasPlaces = placesCount >= 2;

            status.steps.push({
                id: 'route',
                label: 'Create your first route',
                status: hasRoute ? 'completed' : 'pending',
                required: true
            });

            status.steps.push({
                id: 'places',
                label: 'Add saved places',
                status: hasPlaces ? 'completed' : (placesCount > 0 ? 'in-progress' : 'pending'),
                required: false
            });

            status.completed = hasRoute;
        } else if (role === 'driver') {
            const docs = Array.isArray(user.documents) && user.documents.length > 0 ? user.documents[user.documents.length - 1] : null;
            const hasDocs = !!docs;

            const carOwned = await carRepository.findOne({ ownerId: user._id });
            const carAssigned = await carRepository.findOne({
                'assignment.driverEmail': user.email,
                'assignment.status': 'active'
            });
            const hasCar = !!(carOwned || carAssigned);

            const isApproved = user.verificationStatus === 'verified';

            const routeCount = await routeRepository.count({ userId: user._id, role: 'driver' });
            const hasRoute = routeCount > 0;

            status.steps.push({
                id: 'documents',
                label: 'Upload Required Documents',
                status: hasDocs ? 'completed' : 'pending',
                required: true
            });

            status.steps.push({
                id: 'car',
                label: 'Add or Join a Car',
                status: hasCar ? 'completed' : 'pending',
                required: true
            });

            status.steps.push({
                id: 'approval',
                label: 'Wait for Admin Approval',
                status: isApproved ? 'completed' : (user.verificationStatus === 'pending' ? 'in-progress' : 'pending'),
                required: true
            });

            status.steps.push({
                id: 'route',
                label: 'Create a Route',
                status: hasRoute ? 'completed' : 'pending',
                required: false
            });

            status.completed = hasDocs && hasCar && isApproved;
        }

        return status;
    }
}

module.exports = new AuthService();
