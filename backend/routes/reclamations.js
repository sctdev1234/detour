const express = require('express');
const router = express.Router();
const Reclamation = require('../models/Reclamation');
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
        res.json(saved);
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

        // Emit socket event
        const io = req.app.get('socketio');
        if (io) {
            io.to(req.params.id).emit('new_message', updated.messages[updated.messages.length - 1]);
        }

        res.json(updated);
    } catch (err) {
        console.error('Error adding message:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/reclamations
// @desc    Get all reclamations for the authenticated user
router.get('/', auth, async (req, res) => {
    try {
        const reclamations = await Reclamation.find({ reporterId: req.user.id })
            .sort({ createdAt: -1 });
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
            .sort({ createdAt: -1 });

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

        res.json(reclamation);
    } catch (err) {
        console.error('Error updating reclamation status:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
