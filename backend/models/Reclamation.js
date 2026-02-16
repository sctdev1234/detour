const mongoose = require('mongoose');

const ReclamationSchema = new mongoose.Schema({
    reporterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip'
    },
    type: {
        type: String,
        enum: ['accident', 'behaving', 'lost_item', 'technical', 'other'],
        required: true
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    evidenceUrls: [{
        type: String
    }],
    status: {
        type: String,
        enum: ['pending', 'investigating', 'resolved', 'dismissed'],
        default: 'pending'
    },
    messages: [{
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        text: {
            type: String,
            trim: true
        },
        image: {
            type: String
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

module.exports = mongoose.model('Reclamation', ReclamationSchema);
