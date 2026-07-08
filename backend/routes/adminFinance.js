const express = require('express');
const router = express.Router();
const { auth, authAdmin } = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Withdrawal = require('../models/Withdrawal');
const TripInstance = require('../models/TripInstance');
const TransactionService = require('../services/transactionService');

// @route   GET api/admin/finance/ledger
// @desc    Get all transactions (Global Ledger)
// @access  Admin
router.get('/ledger', auth, authAdmin, async (req, res, next) => {
    try {
        const { limit = 50, page = 1 } = req.query;
        const transactions = await Transaction.find()
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit))
            .populate('userId', 'fullName role')
            .populate('relatedUserId', 'fullName role');

        const total = await Transaction.countDocuments();

        res.json({
            transactions,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        });
    } catch (err) {
        next(err);
    }
});

// @route   GET api/admin/finance/withdrawals
// @desc    Get pending withdrawals
// @access  Admin
router.get('/withdrawals', auth, authAdmin, async (req, res, next) => {
    try {
        const { status } = req.query; // 'pending', 'approved', 'rejected'
        const filter = status ? { status } : {};
        
        const withdrawals = await Withdrawal.find(filter)
            .sort({ createdAt: -1 })
            .populate('user', 'fullName phone balance');
            
        res.json(withdrawals);
    } catch (err) {
        next(err);
    }
});

// @route   POST api/admin/finance/withdrawals/:id/approve
// @desc    Approve a withdrawal request
// @access  Admin
router.post('/withdrawals/:id/approve', auth, authAdmin, async (req, res, next) => {
    try {
        const withdrawal = await TransactionService.approveWithdrawal(req.params.id, req.user.id);
        res.json({ msg: 'Withdrawal approved', withdrawal });
    } catch (err) {
        if (err.message === 'Withdrawal not found or not pending') {
            return res.status(404).json({ msg: err.message });
        }
        next(err);
    }
});

// @route   POST api/admin/finance/withdrawals/:id/reject
// @desc    Reject a withdrawal request
// @access  Admin
router.post('/withdrawals/:id/reject', auth, authAdmin, async (req, res, next) => {
    try {
        const { adminNote } = req.body;
        const withdrawal = await TransactionService.rejectWithdrawal(req.params.id, adminNote, req.user.id);
        res.json({ msg: 'Withdrawal rejected', withdrawal });
    } catch (err) {
        if (err.message === 'Withdrawal not found or not pending') {
            return res.status(404).json({ msg: err.message });
        }
        next(err);
    }
});

// @route   POST api/admin/finance/trip/:id/refund
// @desc    Refund a settled trip
// @access  Admin
router.post('/trip/:id/refund', auth, authAdmin, async (req, res, next) => {
    try {
        const { reason } = req.body;
        if (!reason) {
            return res.status(400).json({ msg: 'Reason is required' });
        }
        
        const result = await TransactionService.processRefund(req.params.id, req.user.id, reason);
        res.json({ msg: 'Trip refunded successfully', result });
    } catch (err) {
        if (err.message === 'Trip not found' || err.message === 'Only SETTLED trips can be refunded') {
            return res.status(400).json({ msg: err.message });
        }
        next(err);
    }
});

// @route   GET api/admin/finance/receipt/:tripId
// @desc    Get trip receipt snapshot
// @access  Admin
router.get('/receipt/:tripId', auth, authAdmin, async (req, res, next) => {
    try {
        const trip = await TripInstance.findById(req.params.tripId).select('receiptSnapshot financialStatus');
        if (!trip) {
            return res.status(404).json({ msg: 'Trip not found' });
        }
        
        if (!trip.receiptSnapshot) {
            return res.status(404).json({ msg: 'Receipt not generated yet', financialStatus: trip.financialStatus });
        }
        
        res.json(trip.receiptSnapshot);
    } catch (err) {
        next(err);
    }
});

module.exports = router;
