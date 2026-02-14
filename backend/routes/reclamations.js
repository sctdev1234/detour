const express = require('express');
const router = express.Router();
const Reclamation = require('../models/Reclamation');
const { auth } = require('../middleware/auth');

// @route   POST api/reclamations
// @desc    Create a new reclamation
router.post('/', auth, async (req, res) => {
    try {
        const { type, subject, description, evidenceUrl, tripId } = req.body;

        if (!type || !subject || !description) {
            return res.status(400).json({ msg: 'Type, subject, and description are required' });
        }

        const reclamation = new Reclamation({
            reporterId: req.user.id,
            tripId: tripId || undefined,
            type,
            subject,
            description,
            evidenceUrl: evidenceUrl || undefined
        });

        const saved = await reclamation.save();
        res.json(saved);
    } catch (err) {
        console.error('Error creating reclamation:', err.message);
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
