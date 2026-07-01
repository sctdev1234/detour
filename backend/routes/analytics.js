const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { auth } = require('../middleware/auth');

// @route   GET api/analytics/driver/stats
// @desc    Get driver analytics stats
router.get('/driver/stats', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        const stats = await analyticsService.getDriverStats(req.user.id);
        res.json(stats);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
