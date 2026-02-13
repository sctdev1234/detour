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
