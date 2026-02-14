const Transaction = require('../models/Transaction');

exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.id })
            .sort({ timestamp: -1 })
            .populate('relatedUserId', 'fullName photoURL')
            .populate('tripId');

        res.json(transactions);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
};

const transactionService = require('../services/transactionService');

exports.subscribe = async (req, res) => {
    try {
        const result = await transactionService.subscribe(req.user.id);
        res.json(result);
    } catch (err) {
        console.error("Error in subscribe:", err.message);
        if (err.message === 'Insufficient balance') return res.status(400).json({ msg: err.message });
        if (err.message === 'Already subscribed') return res.status(400).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.cashout = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount) return res.status(400).json({ msg: 'Amount is required' });

        const result = await transactionService.cashout(req.user.id, parseFloat(amount));
        res.json(result);
    } catch (err) {
        console.error("Error in cashout:", err.message);
        if (err.message === 'Insufficient balance') return res.status(400).json({ msg: err.message });
        if (err.message === 'Invalid amount') return res.status(400).json({ msg: err.message });
        res.status(500).send('Server Error');
    }
};

exports.deposit = async (req, res) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) return res.status(400).json({ msg: 'Valid amount is required' });

        const result = await transactionService.deposit(req.user.id, parseFloat(amount));
        res.json({ balance: result });
    } catch (err) {
        console.error("Error in deposit:", err.message);
        res.status(500).send('Server Error');
    }
};
