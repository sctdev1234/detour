const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    }
}, { timestamps: true });

const ChatSchema = new mongoose.Schema({
    requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JoinRequest',
        required: true
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    messages: [MessageSchema]
}, { timestamps: true });

// Ensure one chat per request
ChatSchema.index({ requestId: 1 }, { unique: true });

module.exports = mongoose.model('Chat', ChatSchema);
