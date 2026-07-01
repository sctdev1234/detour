const userRepository = require('../repositories/UserRepository');
const placeRepository = require('../repositories/PlaceRepository');
const routeRepository = require('../repositories/RouteRepository');
const carRepository = require('../repositories/CarRepository');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const fs = require('fs');

class AuthService {
    async signup({ email, password, fullName, role, photoURL, phone }) {
        let user = await userRepository.findByEmail(email);
        if (user) {
            throw new Error('User already exists');
        }
        if (phone) {
            let userByPhone = await userRepository.findOne({ phone });
            if (userByPhone) throw new Error('Phone number already in use');
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
        if (!user) throw new Error('User not found');
        if (user.phoneVerified) throw new Error('Phone already verified');
        
        if (!user.otpCode || user.otpCode !== code) {
            throw new Error('Invalid OTP code');
        }
        if (user.otpExpiresAt < new Date()) {
            throw new Error('OTP code expired');
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
        if (!user) throw new Error('User not found');
        if (user.phoneVerified) throw new Error('Phone already verified');
        
        await this.sendOTP(user);
        return { msg: 'OTP resent successfully' };
    }

    async login({ email, password }) {
        const user = await userRepository.findOne({ email });
        if (!user) {
            throw new Error('Invalid Credentials');
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            throw new Error('Invalid Credentials');
        }

        // Fetch saved places
        const savedPlaces = await placeRepository.find({ user: user.id });
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

        const savedPlaces = await placeRepository.find({ user: userId });
        const userObj = user.toObject();
        userObj.id = user._id.toString(); // Ensure id is always present for frontend
        userObj.savedPlaces = savedPlaces;
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return userObj;

    }

    async forgotPassword({ email }) {
        const user = await userRepository.findOne({ email });
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

    async updateProfile(userId, { fullName, photoURL }) {
        const updateFields = {};
        if (fullName) updateFields.fullName = fullName;
        if (photoURL) updateFields.photoURL = photoURL;

        const user = await userRepository.update(
            userId,
            { $set: updateFields },
            { new: true }
        ).select('-password');


        if (!user) throw new Error('User not found');

        const userObj = user.toObject();
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return userObj;

    }

    async verifyDriver(userId, documents) {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('User not found');

        user.documents.push(documents);
        user.verificationStatus = 'pending';

        await user.save();

        const userObj = user.toObject();
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return userObj;

    }

    async deleteAccount(userId) {
        const user = await userRepository.hardDelete(userId);
        if (!user) throw new Error('User not found');
        return true;
    }

    async changePassword(userId, { oldPassword, newPassword }) {
        const user = await userRepository.findById(userId);
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

    // ...

    async addSavedPlace(userId, placeData) {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error('User not found');

        const newPlace = new SavedPlace({
            user: userId,
            ...placeData
        });
        await newPlace.save();

        // Return all saved places for the user to keep frontend state consistent
        return placeRepository.find({ user: userId });
    }

    async removeSavedPlace(userId, placeId) {
        // Ensure the place belongs to the user
        const result = await SavedPlace.findOneAndDelete({ _id: placeId, user: userId });
        if (!result) throw new Error('Place not found or not authorized');

        // Return updated list
        return placeRepository.find({ user: userId });
    }

    async getSavedPlaces(userId) {
        return placeRepository.find({ user: userId });
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

        // Normalize role to ensure matching works mainly for legacy data
        const role = user.role ? user.role.toLowerCase() : 'client';

        if (role === 'client') {
            // Check if user has at least one route created (Required to unlock app)
            const routeCount = await Route.countDocuments({ userId: user._id, role: 'client' });
            const hasRoute = routeCount > 0;

            // Check if user has saved places (Optional)
            const placesCount = await SavedPlace.countDocuments({ user: user._id });
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
            // 1. Upload Documents (Required)
            const docs = Array.isArray(user.documents) && user.documents.length > 0 ? user.documents[user.documents.length - 1] : null;
            const hasDocs = !!docs;

            // 2. Add Car (Required)
            // Check if user owns a car OR is assigned to one
            // Use lean queries for performance and safety
            const carOwned = await Car.findOne({ ownerId: user._id });
            const carAssigned = await Car.findOne({
                'assignment.driverEmail': user.email,
                'assignment.status': 'active'
            });
            const hasCar = !!(carOwned || carAssigned);

            // 3. Admin Approval (Required)
            const isApproved = user.verificationStatus === 'verified';

            // 4. Create Route (Optional)
            const routeCount = await Route.countDocuments({ userId: user._id, role: 'driver' });
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

            // Only unlock if ALL required steps are done.
            // For legacy users without onboardingStatus, this calculation determines access.
            status.completed = hasDocs && hasCar && isApproved;
        }

        return status;
    }
}


module.exports = new AuthService();
