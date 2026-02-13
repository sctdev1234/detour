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
    photoURL: String, // Base64 or URL
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
    }
});

// Add 2d index for location-based queries (supports legacy { latitude, longitude })
UserSchema.index({ location: '2d' });

module.exports = mongoose.model('User', UserSchema);
