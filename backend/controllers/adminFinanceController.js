const Transaction = require('../models/Transaction');
const walletService = require('../services/walletService');

/**
 * Get all ledger transactions
 */
exports.getTransactions = async (req, res) => {
    try {
        const transactions = await Transaction.find()
            .sort({ timestamp: -1 })
            .populate('userId', 'fullName role')
            .populate('relatedUserId', 'fullName role')
            .populate('tripInstanceId'); // Optional

        res.json(transactions);
    } catch (err) {
        console.error("Admin getTransactions Error:", err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * Get all withdrawals (pending/approved/rejected)
 */
exports.getWithdrawals = async (req, res) => {
    try {
        const status = req.query.status;
        const query = { category: 'withdrawal' };
        if (status) {
            query.status = status;
        } else {
            // Default to showing pending first if no filter
        }

        const withdrawals = await Transaction.find(query)
            .sort({ timestamp: -1 })
            .populate('userId', 'fullName phone balance');

        res.json(withdrawals);
    } catch (err) {
        console.error("Admin getWithdrawals Error:", err.message);
        res.status(500).send('Server Error');
    }
};

/**
 * Approve a withdrawal
 */
exports.approveWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId } = req.user; // Assuming req.user has the admin context
        const note = req.body.note || 'Approved by admin';

        const result = await walletService.approveWithdrawal(id, adminId || 'admin', note);
        res.json({ msg: 'Withdrawal approved', transaction: result });
    } catch (err) {
        console.error("Admin approveWithdrawal Error:", err.message);
        if (err.message === 'Transaction not found' || err.message === 'Transaction is not a pending withdrawal') {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error');
    }
};

/**
 * Reject a withdrawal
 */
exports.rejectWithdrawal = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId } = req.user;
        const note = req.body.reason || 'Rejected by admin';

        const result = await walletService.rejectWithdrawal(id, adminId || 'admin', note);
        res.json({ msg: 'Withdrawal rejected', transaction: result.reversal });
    } catch (err) {
        console.error("Admin rejectWithdrawal Error:", err.message);
        if (err.message === 'Transaction not found' || err.message === 'Transaction is not a pending withdrawal') {
            return res.status(400).json({ msg: err.message });
        }
        res.status(500).send('Server Error');
    }
};
