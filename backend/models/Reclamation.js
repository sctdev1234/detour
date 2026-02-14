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
        enum: ['accident', 'behaving', 'lost_item', 'other'],
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
    evidenceUrl: {
        type: String
    },
    status: {
        type: String,
        enum: ['pending', 'investigating', 'resolved', 'dismissed'],
        default: 'pending'
    }
}, { timestamps: true });

module.exports = mongoose.model('Reclamation', ReclamationSchema);
