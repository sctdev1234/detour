const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SavedPlace = require('../models/SavedPlace');
const Route = require('../models/Route');
const Car = require('../models/Car');

const fs = require('fs');

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
        const onboardingStatus = await this.calculateOnboardingStatus(user);
        const userObj = user.toObject();
        userObj.onboardingStatus = onboardingStatus;


        return { user: userObj, token };

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

        // Fetch saved places
        const savedPlaces = await SavedPlace.find({ user: user.id });
        const userObj = user.toObject();
        userObj.savedPlaces = savedPlaces;
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return {
            token: this.generateToken(user),
            user: userObj
        };

    }

    async getUser(userId) {
        const user = await User.findById(userId).select('-password');
        if (!user) return null;

        const savedPlaces = await SavedPlace.find({ user: userId });
        const userObj = user.toObject();
        userObj.savedPlaces = savedPlaces;
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return userObj;

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

        const userObj = user.toObject();
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return userObj;

    }

    async verifyDriver(userId, documents) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        user.documents.push(documents);
        user.verificationStatus = 'pending';

        await user.save();

        const userObj = user.toObject();
        userObj.onboardingStatus = await this.calculateOnboardingStatus(user);

        return userObj;

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

    // ...

    async addSavedPlace(userId, placeData) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        const newPlace = new SavedPlace({
            user: userId,
            ...placeData
        });
        await newPlace.save();

        // Return all saved places for the user to keep frontend state consistent
        return SavedPlace.find({ user: userId });
    }

    async removeSavedPlace(userId, placeId) {
        // Ensure the place belongs to the user
        const result = await SavedPlace.findOneAndDelete({ _id: placeId, user: userId });
        if (!result) throw new Error('Place not found or not authorized');

        // Return updated list
        return SavedPlace.find({ user: userId });
    }

    async getSavedPlaces(userId) {
        return SavedPlace.find({ user: userId });
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
            const docs = user.documents && user.documents.length > 0 ? user.documents[user.documents.length - 1] : null;
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
