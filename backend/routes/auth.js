const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');

// @route   POST api/auth/signup
// @desc    Register new user
router.post('/signup', (req, res) => authController.signup(req, res));

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', (req, res) => authController.login(req, res));

// @route   POST api/auth/forgot-password
// @desc    Generate password reset token
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));

// @route   POST api/auth/reset-password
// @desc    Reset password
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

// @desc    Update user profile
router.put('/update', auth, (req, res) => authController.update(req, res));

// @route   POST api/auth/verify
// @desc    Submit verification documents
router.post('/verify', auth, (req, res) => authController.verify(req, res));

// @route   GET api/auth/me
// @desc    Get current user
router.get('/me', auth, (req, res) => authController.getMe(req, res));

// @route   DELETE api/auth/delete
// @desc    Delete user account
router.delete('/delete', auth, (req, res) => authController.delete(req, res));

// @route   POST api/auth/change-password
// @desc    Change user password
router.post('/change-password', auth, (req, res) => authController.changePassword(req, res));

// @route   POST api/auth/places
// @desc    Add a saved place
router.post('/places', auth, (req, res) => authController.addSavedPlace(req, res));

// @route   DELETE api/auth/places/:id
// @desc    Remove a saved place
router.delete('/places/:id', auth, (req, res) => authController.removeSavedPlace(req, res));

module.exports = router;
