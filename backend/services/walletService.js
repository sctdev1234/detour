const Transaction = require('../models/Transaction');
const User = require('../models/User');

class WalletService {
    // 15% Platform Commission
    static COMMISSION_RATE = 0.15;

    async getDriverWallet(userId) {
        const user = await User.findById(userId).select('balance earnings spending');
        if (!user) throw new Error('Driver not found');
        
        const transactions = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(50);
        
        return {
            balance: user.balance,
            earningsToday: user.earnings?.today || 0,
            earningsTotal: user.earnings?.total || 0,
            transactions
        };
    }

    async processTripEarnings(tripId, driverId, tripPrice) {
        // Calculate commission
        const commissionAmount = Number((tripPrice * WalletService.COMMISSION_RATE).toFixed(2));
        const driverEarning = Number((tripPrice - commissionAmount).toFixed(2));

        // Create Transactions
        const earningTx = new Transaction({
            userId: driverId,
            amount: driverEarning,
            type: 'credit',
            category: 'earning',
            tripId,
            description: `Earnings from Trip ${tripId}`
        });

        const commissionTx = new Transaction({
            userId: driverId, // Associate commission to driver account technically
            amount: commissionAmount,
            type: 'debit',
            category: 'commission',
            tripId,
            description: `Platform Commission (15%) for Trip ${tripId}`
        });

        await earningTx.save();
        await commissionTx.save();

        // Update Driver Wallet
        await User.findByIdAndUpdate(driverId, {
            $inc: { 
                balance: driverEarning,
                'earnings.total': driverEarning,
                'earnings.today': driverEarning // Note: In a real system, you'd reset 'today' via a cron job
            }
        });

        return { driverEarning, commissionAmount };
    }

    async withdraw(userId, amount) {
        const user = await User.findById(userId);
        if (user.balance < amount) throw new Error('Insufficient funds');
        if (amount < 50) throw new Error('Minimum withdrawal is 50 MAD'); // Assuming MAD

        // Create Pending Transaction
        const withdrawTx = new Transaction({
            userId,
            amount,
            type: 'debit',
            category: 'withdrawal',
            status: 'pending',
            description: `Withdrawal request`
        });
        await withdrawTx.save();

        // Deduct balance immediately
        await User.findByIdAndUpdate(userId, {
            $inc: { balance: -amount }
        });

        return withdrawTx;
    }
}

module.exports = new WalletService();
