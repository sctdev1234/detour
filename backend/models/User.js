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
    documents: {
        cinFront: String,
        cinBack: String,
        license: String,
        facePhoto: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date
});

module.exports = mongoose.model('User', UserSchema);
