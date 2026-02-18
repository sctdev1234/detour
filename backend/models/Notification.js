const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
    recipient: {
        type: String,
        required: true,
        index: true // 'admin' or userId
    },
    type: {
        type: String,
        required: true,
        enum: ['new_ticket', 'new_message', 'status_update', 'other']
    },
    title: {
        type: String,
        required: true
    },
    message: {
        type: String,
        required: true
    },
    data: {
        type: Object
    },
    read: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 * 60 * 24 * 30 // Auto-delete after 30 days
    }
}, { timestamps: true });

module.exports = mongoose.model('Notification', NotificationSchema);
