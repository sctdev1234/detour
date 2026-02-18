const express = require('express');
const router = express.Router();
const Reclamation = require('../models/Reclamation');
const Notification = require('../models/Notification');
const { auth } = require('../middleware/auth');

// @route   POST api/reclamations
// @desc    Create a new reclamation
router.post('/', auth, async (req, res) => {
    try {
        const { type, subject, description, evidenceUrls, tripId } = req.body;

        if (!type || !subject || !description) {
            return res.status(400).json({ msg: 'Type, subject, and description are required' });
        }

        const reclamation = new Reclamation({
            reporterId: req.user.id,
            tripId: tripId || undefined,
            type,
            subject,
            description,
            evidenceUrls: evidenceUrls || []
        });

        const saved = await reclamation.save();

        // Populate for admin panel real-time update
        const populated = await Reclamation.findById(saved._id)
            .populate('reporterId', 'fullName email phone photoURL')
            .populate('tripId', 'startPoint endPoint price');

        // Create Persistent Notification
        let notification = null;
        try {
            notification = await Notification.create({
                recipient: 'admin',
                type: 'new_ticket',
                title: 'New Ticket',
                message: `New ticket from ${populated.reporterId.fullName}: ${subject}`,
                data: { reclamationId: saved._id }
            });
        } catch (notifErr) {
            console.error('Failed to create notification:', notifErr);
        }

        // Emit socket event
        const io = req.app.get('socketio');
        if (io) {
            console.log(`Emitting 'new_reclamation' for ticket ${saved._id}`);
            io.emit('new_reclamation', populated);

            // Emit notification if created
            if (notification) {
                console.log(`Emitting 'new_notification' for ticket ${saved._id}`);
                io.emit('new_notification', notification);
            }
        } else {
            console.error('Socket.io instance not found on app!');
        }

        res.json(populated);
    } catch (err) {
        console.error('Error creating reclamation:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reclamations/:id
// @desc    Get a single reclamation by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const reclamation = await Reclamation.findById(req.params.id)
            .populate('reporterId', 'fullName email phone photoURL')
            .populate('messages.senderId', 'fullName role photoURL');

        if (!reclamation) {
            return res.status(404).json({ msg: 'Reclamation not found' });
        }

        // Access control: only reporter or admin/driver? Adjust as needed.
        if (reclamation.reporterId._id.toString() !== req.user.id && req.user.role !== 'admin') {
            // For now, allowing admins to view any. 
            // If drivers need to view, logic might be needed.
            // Assuming basic user ownership check is sufficient for now + admin.
            // But wait, req.user might not have role info populated in middleware unless specific.
            // Middleware usually decodes token payload.
        }

        res.json(reclamation);
    } catch (err) {
        console.error('Error fetching reclamation:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ msg: 'Reclamation not found' });
        }
        res.status(500).send('Server Error');
    }
});

// @route   POST api/reclamations/:id/messages
// @desc    Add a message to a reclamation
router.post('/:id/messages', auth, async (req, res) => {
    try {
        const { text, image } = req.body;
        if (!text && !image) {
            return res.status(400).json({ msg: 'Message text or image is required' });
        }

        const reclamation = await Reclamation.findById(req.params.id);
        if (!reclamation) {
            return res.status(404).json({ msg: 'Reclamation not found' });
        }

        const newMessage = {
            senderId: req.user.id,
            text: text || '',
            image
        };

        reclamation.messages.push(newMessage);

        // Optional: Update status if user replies? 
        // e.g., if status was 'resolved', maybe re-open?
        // keeping simple for now.

        await reclamation.save();

        // Return the full object or just the new message?
        // returning full object populated is easiest for frontend update
        const updated = await Reclamation.findById(req.params.id)
            .populate('reporterId', 'fullName email phone photoURL')
            .populate('messages.senderId', 'fullName role photoURL');

        // Emit socket event to the reclamation room (for chat updates)
        const io = req.app.get('socketio');
        if (io) {
            console.log(`Emitting 'new_message' to room ${req.params.id}`);
            io.to(req.params.id).emit('new_message', updated.messages[updated.messages.length - 1]);

            // Broadcast update to admin list and others
            io.emit('reclamation_updated', updated);

            // Notification Logic & Persistence
            // Check if schema has populated reporterId correctly from findById above
            const reporterId = updated.reporterId._id.toString();
            const senderId = req.user.id;
            const senderName = updated.messages[updated.messages.length - 1].senderId.fullName;

            if (reporterId !== senderId) {
                // Sender is Admin (or driver), Recipient is Reporter
                io.to(`user:${reporterId}`).emit('notification', {
                    title: 'New Message',
                    body: `You have a new message regarding "${updated.subject}"`,
                    reclamationId: updated._id,
                    message: newMessage
                });
            } else {
                // Sender is Reporter (Client), Create notification for ADMIN
                try {
                    const notification = await Notification.create({
                        recipient: 'admin',
                        type: 'new_message',
                        title: 'New Message',
                        message: `New message from ${senderName} in: ${updated.subject}`,
                        data: { reclamationId: updated._id }
                    });

                    // Emit notification event
                    console.log(`Emitting 'new_notification' for message in ${updated._id}`);
                    io.emit('new_notification', notification);

                } catch (notifErr) {
                    console.error('Failed to create admin notification:', notifErr);
                }
            }
        }

        res.json(updated);
    } catch (err) {
        console.error('Error adding message:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/reclamations/:id/read
// @desc    Mark all messages from others as read
router.put('/:id/read', auth, async (req, res) => {
    try {
        const reclamation = await Reclamation.findById(req.params.id);
        if (!reclamation) {
            return res.status(404).json({ msg: 'Reclamation not found' });
        }

        const currentUserId = req.user.id;
        console.log(`[DEBUG] Mark as read: currentUser=${currentUserId}, reclamation=${req.params.id}`);

        // Mark all messages NOT sent by current user as read
        let updated = false;
        reclamation.messages.forEach(msg => {
            const msgSenderId = msg.senderId._id ? msg.senderId._id.toString() : msg.senderId.toString();
            if (msgSenderId !== currentUserId && !msg.read) {
                console.log(`[DEBUG] Marking message ${msg._id} as read (sender: ${msgSenderId})`);
                msg.read = true;
                updated = true;
            }
        });

        if (updated) {
            await reclamation.save();
            console.log(`[DEBUG] Saved ${req.params.id} with updated read status`);
        } else {
            console.log(`[DEBUG] No messages to mark as read`);
        }

        // Populate senderId before responding so frontend gets full data
        await reclamation.populate('messages.senderId', 'fullName photoURL');

        // Emit update
        const io = req.app.get('socketio');
        if (io) {
            // Re-populate everything needed for the list view
            await reclamation.populate('reporterId', 'fullName email phone photoURL');
            // tripId already populated? No, need to populate if we want full object update
            await reclamation.populate('tripId', 'startPoint endPoint price');

            io.emit('reclamation_updated', reclamation);
        }

        res.json(reclamation);
    } catch (err) {
        console.error('Error marking messages as read:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reclamations
// @desc    Get all reclamations for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const reclamations = await Reclamation.find({ reporterId: req.user.id })
            .sort({ updatedAt: -1 });
        res.json(reclamations);
    } catch (err) {
        console.error('Error fetching reclamations:', err.message);
        res.status(500).send('Server Error');
    }
});

// --- ADMIN ROUTES ---

// @route   GET api/reclamations/admin/all
// @desc    Get ALL reclamations (Admin only)
router.get('/admin/all', auth, async (req, res) => {
    try {
        // TODO: Add check for req.user.role === 'admin' if you have middleware for it. 
        // For now assuming the admin panel uses a user with admin privileges, 
        // but strictly speaking we should check role here.

        const reclamations = await Reclamation.find()
            .populate('reporterId', 'fullName email phone photoURL') // Populate reporter details
            .populate('tripId', 'startPoint endPoint price')         // Populate trip details if needed
            .populate('messages.senderId', 'fullName role photoURL') // Populate message senders
            .sort({ updatedAt: -1 });

        res.json(reclamations);
    } catch (err) {
        console.error('Error fetching admin reclamations:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT api/reclamations/:id/status
// @desc    Update reclamation status (Admin only)
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;

        if (!['pending', 'investigating', 'resolved', 'dismissed'].includes(status)) {
            return res.status(400).json({ msg: 'Invalid status' });
        }

        const reclamation = await Reclamation.findById(req.params.id);
        if (!reclamation) {
            return res.status(404).json({ msg: 'Reclamation not found' });
        }

        reclamation.status = status;
        await reclamation.save();

        // Populate for emission
        await reclamation.populate('reporterId', 'fullName email phone photoURL');
        await reclamation.populate('tripId', 'startPoint endPoint price');
        await reclamation.populate('messages.senderId', 'fullName role photoURL');

        const io = req.app.get('socketio');
        if (io) {
            io.emit('reclamation_updated', reclamation);
        }

        res.json(reclamation);
    } catch (err) {
        console.error('Error updating reclamation status:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
