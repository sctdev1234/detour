const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const transactionController = require('../controllers/transactionController');

// @route   GET api/transactions
// @desc    Get user transactions
// @access  Private
router.get('/', auth, transactionController.getTransactions);

module.exports = router;
