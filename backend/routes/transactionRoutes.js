const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

// @route   GET api/transactions
// @desc    Get user transactions
// @access  Private
router.get('/', auth, transactionController.getTransactions);
// @route   POST api/transactions/subscribe
// @desc    Subscribe to Pro plan
// @access  Private
router.post('/subscribe', auth, transactionController.subscribe);

// @route   POST api/transactions/cashout
// @desc    Cashout funds
// @access  Private
router.post('/cashout', auth, transactionController.cashout);

module.exports = router;
