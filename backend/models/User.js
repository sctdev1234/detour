const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String // Hashed password, optional for OAuth/Guest
    },
    authProvider: {
        type: String,
        enum: ['email', 'phone', 'google', 'apple', 'guest'],
        default: 'email'
    },
    googleId: { type: String, sparse: true, unique: true },
    appleId: { type: String, sparse: true, unique: true },
    guestId: { type: String, sparse: true, unique: true },
    devices: [{
        deviceId: String,
        deviceType: String,
        pushToken: String,
        lastActive: Date,
        isActive: { type: Boolean, default: true }
    }],
    profileCompletion: {
        percentage: { type: Number, default: 0 },
        missingFields: [String]
    },
    language: {
        type: String,
        default: 'en'
    },
    preferences: {
        notifications: { type: Boolean, default: true },
        privacy: { type: Boolean, default: false }
    },
    accountStatus: {
        type: String,
        enum: ['active', 'deactivated', 'deleted', 'blocked'],
        default: 'active'
    },
    fullName: {
        type: String // Optional initially for phone/guest onboarding
    },
    photoURL: String, // URL
    role: {
        type: String,
        enum: ['client', 'driver', 'admin'],
        default: 'client'
    },
    verificationStatus: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'unverified'],
        default: 'unverified'
    },
    phone: {
        type: String,
        unique: true,
        sparse: true
    },
    phoneVerified: {
        type: Boolean,
        default: false
    },
    otpCode: String,
    otpExpiresAt: Date,
    documents: [{
        cinFront: String,
        cinBack: String,
        license: String,
        carRegistration: String,
        facePhoto: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'partial'],
            default: 'pending'
        },
        rejectionReason: String,
        submittedAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    refreshToken: String,
    location: {
        latitude: Number,
        longitude: Number,
        heading: Number,
        speed: Number,
        timestamp: Number,
        updatedAt: { type: Date, default: Date.now }
    },
    currentLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        }
    },
    // Financials
    balance: {
        type: Number,
        default: 0
    },
    earnings: {
        today: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    spending: {
        today: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
    },
    subscription: {
        status: {
            type: String,
            enum: ['free', 'pro'],
            default: 'free'
        },
        expiresAt: Date
    },
    // Stats
    stats: {
        tripsDone: { type: Number, default: 0 }, // For both client (rides) and driver (drives)
        clientsServed: { type: Number, default: 0 }, // For driver
        hoursOnline: { type: Number, default: 0 },
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    toObject: { virtuals: true },
    toJSON: { virtuals: true },
    timestamps: true
});

// Auto-sync location before save
UserSchema.pre('save', function() {
    if (this.isModified('location.latitude') || this.isModified('location.longitude')) {
        if (this.location && this.location.latitude && this.location.longitude) {
            this.currentLocation = {
                type: 'Point',
                coordinates: [this.location.longitude, this.location.latitude]
            };
        }
    }
});

UserSchema.index({ 'currentLocation': '2dsphere' });
UserSchema.index({ role: 1, isDeleted: 1 });

module.exports = mongoose.model('User', UserSchema);
