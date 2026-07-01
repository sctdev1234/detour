const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { auth } = require('../middleware/auth');

// @route   POST api/wallet/topup
// @desc    Top up user wallet balance
// @access  Private
router.post('/topup', auth, async (req, res) => {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ msg: 'Please provide a valid positive amount' });
    }

    const session = await User.startSession();
    session.startTransaction();

    try {
        const user = await User.findById(req.user.id).session(session);

        if (!user) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ msg: 'User not found' });
        }

        // Add amount to balance
        user.balance += Number(amount);
        await user.save({ session });

        // Create transaction record
        await Transaction.create([{
            userId: user._id,
            amount: Number(amount),
            type: 'credit',
            category: 'topup',
            description: `Wallet top-up (simulated via API)`,
            isIrreversible: true
        }], { session });

        await session.commitTransaction();
        session.endSession();

        res.json({ msg: 'Top-up successful', balance: user.balance });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error('Wallet Topup Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
