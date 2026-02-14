const mongoose = require('mongoose');

const JoinRequestSchema = new mongoose.Schema({
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    clientRouteId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Route',
        required: true
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    },
    initiatedBy: {
        type: String,
        enum: ['driver', 'client'],
        required: true,
        default: 'client' // Default to client for backward compatibility if needed, though we aim to switch flow
    },
    proposedPrice: {
        type: Number,
        required: false // Optional, can be used for counter-offers or confirming agreed price
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('JoinRequest', JoinRequestSchema);
