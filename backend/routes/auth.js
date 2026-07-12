const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const authController = require('../controllers/authController');
const { authLimiter, otpLimiter, otpVerifyLimiter, apiLimiter } = require('../middleware/rateLimiter');

// @route   POST api/auth/signup
// @desc    Register new user
router.post('/signup', authLimiter, (req, res, next) => authController.signup(req, res, next));

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', authLimiter, (req, res, next) => authController.login(req, res, next));

// @route   POST api/auth/refresh
// @desc    Refresh session token
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));

// @route   POST api/auth/forgot-password
// @desc    Generate password reset token
router.post('/forgot-password', (req, res, next) => authController.forgotPassword(req, res, next));

// @route   POST api/auth/reset-password
// @desc    Reset password
router.post('/reset-password', (req, res, next) => authController.resetPassword(req, res, next));

// @route   POST api/auth/verify-otp
// @desc    Verify phone OTP
router.post('/verify-otp', otpVerifyLimiter, (req, res, next) => authController.verifyOTP(req, res, next));

// @route   POST api/auth/resend-otp
// @desc    Resend phone OTP
router.post('/resend-otp', otpLimiter, (req, res, next) => authController.resendOTP(req, res, next));

// @desc    Update user profile
router.put('/update', auth, (req, res, next) => authController.update(req, res, next));

// @route   PUT api/auth/status
// @desc    Update driver status
router.put('/status', auth, (req, res, next) => authController.updateStatus(req, res, next));

// @route   POST api/auth/verify
// @desc    Submit verification documents
router.post('/verify', auth, (req, res, next) => authController.verify(req, res, next));

// @route   GET api/auth/me
// @desc    Get current user
router.get('/me', auth, (req, res, next) => authController.getMe(req, res, next));

// @route   POST api/auth/deactivate
// @desc    Deactivate user account
router.post('/deactivate', auth, (req, res, next) => authController.deactivate(req, res, next));

// @route   DELETE api/auth/delete
// @desc    Delete user account
router.delete('/delete', auth, (req, res, next) => authController.delete(req, res, next));

// @route   POST api/auth/change-password
// @desc    Change user password
router.post('/change-password', auth, (req, res, next) => authController.changePassword(req, res, next));

// @route   POST api/auth/places
// @desc    Add a saved place
router.post('/places', auth, (req, res, next) => authController.addSavedPlace(req, res, next));

// @route   DELETE api/auth/places/:id
// @desc    Remove a saved place
router.delete('/places/:id', auth, apiLimiter, (req, res, next) => authController.removeSavedPlace(req, res, next));

// @route   POST api/auth/oauth
// @desc    Authenticate user via Google/Apple
router.post('/oauth', authLimiter, (req, res, next) => authController.oauthLogin(req, res, next));

// @route   POST api/auth/guest
// @desc    Authenticate user as Guest
router.post('/guest', authLimiter, (req, res, next) => authController.guestLogin(req, res, next));

// @route   POST api/auth/logout
// @desc    Logout user and remove device
router.post('/logout', auth, (req, res, next) => authController.logout(req, res, next));

// @route   POST api/auth/revoke-all
// @desc    Revoke all sessions for a user
router.post('/revoke-all', auth, (req, res, next) => authController.revokeAll(req, res, next));

module.exports = router;
