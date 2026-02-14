const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const { auth } = require('../middleware/auth');

// @route   GET api/chat/:requestId
// @desc    Get or create a chat for a request
router.get('/:requestId', auth, async (req, res) => {
    try {
        let chat = await Chat.findOne({ requestId: req.params.requestId })
            .populate('messages.senderId', 'fullName photoURL');

        if (!chat) {
            // Create empty chat for this request
            chat = new Chat({
                requestId: req.params.requestId,
                participants: [req.user.id],
                messages: []
            });
            await chat.save();
        }

        // Add current user to participants if not already there
        if (!chat.participants.some(p => p.toString() === req.user.id)) {
            chat.participants.push(req.user.id);
            await chat.save();
        }

        res.json(chat);
    } catch (err) {
        console.error('Error fetching chat:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST api/chat/:requestId/message
// @desc    Send a message to a chat
router.post('/:requestId/message', auth, async (req, res) => {
    try {
        const { text } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ msg: 'Message text is required' });
        }

        let chat = await Chat.findOne({ requestId: req.params.requestId });

        if (!chat) {
            chat = new Chat({
                requestId: req.params.requestId,
                participants: [req.user.id],
                messages: []
            });
        }

        chat.messages.push({
            senderId: req.user.id,
            text: text.trim()
        });

        // Add user to participants if not already
        if (!chat.participants.some(p => p.toString() === req.user.id)) {
            chat.participants.push(req.user.id);
        }

        await chat.save();

        // Return the newly added message
        const newMessage = chat.messages[chat.messages.length - 1];
        res.json(newMessage);
    } catch (err) {
        console.error('Error sending message:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
