const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String, // Hashed password
        required: true
    },
    fullName: {
        type: String,
        required: true
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
    documents: [{
        cinFront: String,
        cinBack: String,
        license: String,
        carRegistration: String,
        facePhoto: String,
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
    location: {
        latitude: Number,
        longitude: Number,
        heading: Number,
        speed: Number,
        timestamp: Number,
        updatedAt: { type: Date, default: Date.now }
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
        rating: { type: Number, default: 5.0, min: 0, max: 5 } // Moving rating to user model for easier access
    }
});

// Add 2d index for location-based queries (supports legacy { latitude, longitude })
UserSchema.index({ location: '2d' });

module.exports = mongoose.model('User', UserSchema);
