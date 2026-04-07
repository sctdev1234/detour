const express = require('express');
const router = express.Router();
const { getAllPages, getPageByType, updatePage } = require('../controllers/pageController');
const { auth } = require('../middleware/auth');

// Middleware to verify if user is admin
const adminCheck = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ msg: 'Access denied: Admins only' });
    }
    next();
};

// Public route to get a single page's content (e.g. for the mobile app)
router.get('/:pageType', getPageByType);

// Admin routes to get all pages and update them
router.get('/', auth, adminCheck, getAllPages);
router.put('/:pageType', auth, adminCheck, updatePage);

module.exports = router;
