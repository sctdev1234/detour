const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// @route   GET api/notifications
// @desc    Get unread notifications for admin (or user if expanded)
router.get('/', auth, async (req, res) => {
    try {
        // For now, assume admin fetches 'admin' notifications
        // If we want personalized, check req.user.role
        // const recipient = req.user.role === 'admin' ? 'admin' : req.user.id;

        // Simpler: Just fetch 'admin' for now as requested
        const recipient = 'admin';

        const notifications = await Notification.find({ recipient, read: false })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(notifications);
    } catch (err) {
        console.error('Error fetching notifications:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/notifications/read-all
// @desc    Mark all as read
router.put('/read-all', auth, async (req, res) => {
    try {
        const recipient = 'admin';
        await Notification.updateMany({ recipient, read: false }, { read: true });
        res.json({ msg: 'All notifications marked as read' });
    } catch (err) {
        console.error('Error marking all notifications as read:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/notifications/:id/read
// @desc    Mark single notification as read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);
        if (!notification) {
            return res.status(404).json({ msg: 'Notification not found' });
        }

        notification.read = true;
        await notification.save();

        res.json(notification);
    } catch (err) {
        console.error('Error marking notification as read:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
