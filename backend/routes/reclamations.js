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

module.exports = router;
