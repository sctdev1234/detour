const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// @route   POST api/wallet/topup
// @desc    Top up user wallet balance via PaymentProvider
// @access  Private
router.post('/topup', auth, async (req, res) => {
    const { amount, sourceId, idempotencyKey } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ msg: 'Please provide a valid positive amount' });
    }

    if (!idempotencyKey) {
        return res.status(400).json({ msg: 'Idempotency key is required' });
    }

    try {
        // 1. Process Payment
        const PaymentProvider = require('../services/paymentProvider');
        const paymentResult = await PaymentProvider.processPayment({
            amount,
            currency: 'MAD',
            sourceId: sourceId || 'tok_sandbox',
            idempotencyKey
        });

        if (!paymentResult.success) {
            return res.status(400).json({ msg: paymentResult.error || 'Payment failed' });
        }

        // 2. Add to Wallet via TransactionService
        const txService = require('../services/transactionService');
        const result = await txService.processRecharge(req.user.id, Number(amount), paymentResult.transactionId);

        res.json({ msg: 'Top-up successful', balance: result.newBalance, transactionId: paymentResult.transactionId });
    } catch (err) {
        console.error('Wallet Topup Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET api/wallet/balance
// @desc    Get user wallet balance
router.get('/balance', auth, async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id).select('balance');
        if (!user) return res.status(404).json({ msg: 'User not found' });
        res.json({ balance: user.balance });
    } catch (err) {
        next(err);
    }
});

const walletService = require('../services/walletService');

// @route   GET api/wallet/driver
// @desc    Get driver wallet balance and history
router.get('/driver', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        const wallet = await walletService.getDriverWallet(req.user.id);
        res.json(wallet);
    } catch (err) {
        next(err);
    }
});

// @route   POST api/wallet/driver/withdraw
// @desc    Withdraw funds
router.post('/driver/withdraw', auth, async (req, res, next) => {
    try {
        if (req.user.role !== 'driver') {
            return res.status(403).json({ msg: 'Access denied' });
        }
        const { amount, paymentMethod, paymentDetails } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ msg: 'Invalid amount' });
        }
        if (!paymentMethod || !paymentDetails) {
            return res.status(400).json({ msg: 'Payment method and details are required' });
        }
        const TransactionService = require('../services/transactionService');
        const withdrawal = await TransactionService.processWithdrawalRequest(req.user.id, amount, paymentMethod, paymentDetails);
        res.json({ msg: 'Withdrawal requested successfully', withdrawal });
    } catch (err) {
        if (err.message === 'Insufficient balance or invalid amount') {
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
});

module.exports = router;
