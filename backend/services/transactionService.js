const Transaction = require('../models/Transaction');
const User = require('../models/User');

class TransactionService {

    /**
     * Get current balance for a user
     */
    async getBalance(userId) {
        const user = await User.findById(userId);
        return user ? user.balance : 0;
    }

    /**
     * Process a trip payment from Client to Driver + Company Commission
     */
    async processTripPayment(tripId, clientId, driverId, amount) {
        const session = await User.startSession();
        session.startTransaction();

        try {
            const client = await User.findById(clientId).session(session);
            const driver = await User.findById(driverId).session(session);

            if (!client || !driver) {
                throw new Error('User not found');
            }

            // 1. Verify Client Balance
            if (client.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // 2. Calculate Commission (10%, Min 2 MAD)
            let commission = amount * 0.10;
            if (commission < 2) commission = 2; // Minimum commission

            // Ensure commission doesn't exceed total amount (edge case for very cheap trips)
            if (commission > amount) commission = amount;

            const driverEarnings = amount - commission;

            // 3. Deduct from Client
            client.balance -= amount;
            client.spending.total += amount;
            client.spending.today += amount;
            client.stats.tripsDone += 1; // Increment ride count
            await client.save({ session });

            // 4. Credit Driver
            driver.balance += driverEarnings;
            driver.earnings.total += driverEarnings;
            driver.earnings.today += driverEarnings;
            driver.stats.clientsServed += 1;
            await driver.save({ session });

            // 5. Create Transaction Records

            // Debit record for Client
            await Transaction.create([{
                userId: clientId,
                amount: amount,
                type: 'debit',
                category: 'pickup_payment',
                relatedUserId: driverId,
                tripId: tripId,
                description: `Payment for trip`,
                isIrreversible: true
            }], { session });

            // Credit record for Driver
            await Transaction.create([{
                userId: driverId,
                amount: driverEarnings,
                type: 'credit',
                category: 'pickup_payment',
                relatedUserId: clientId,
                tripId: tripId,
                description: `Earnings from trip`,
                isIrreversible: true
            }], { session });

            // Commission record (System/Company view - currently just stored as a transaction linked to driver/system)
            // Ideally we have a 'Company' user or just track it. For now, let's just log it or assign to an admin if exists.
            // We can also just tag it on the driver side as a 'fee' separate transaction if we wanted, 
            // but effectively we just gave them net earnings. 
            // Let's create a 'commission' record explicitly linked to driver for transparency if needed, 
            // but currently the math: Driver get (Amount - Commission). 
            // If we want to show "Gross: 50, Fee: 5, Net: 45", we do it differently.
            // Current approach: Driver Balance += 45. Simple.

            await session.commitTransaction();
            session.endSession();

            return { success: true, clientBalance: client.balance, driverBalance: driver.balance };

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    /**
     * Add funds to user wallet (Cash In)
     */
    async deposit(userId, amount) {
        const user = await User.findById(userId);
        if (!user) throw new Error('User not found');

        user.balance += amount;
        await user.save();

        await Transaction.create({
            userId,
            amount,
            type: 'credit',
            category: 'deposit',
            description: 'Wallet deposit'
        });

        return user.balance;
    }
    /**
     * Subscribe user to Pro plan
     */
    async subscribe(userId) {
        const session = await User.startSession();
        session.startTransaction();

        try {
            const user = await User.findById(userId).session(session);
            if (!user) throw new Error('User not found');

            if (user.subscription && user.subscription.status === 'pro' && user.subscription.expiresAt > new Date()) {
                throw new Error('Already subscribed');
            }

            const amount = 29.99;

            if (user.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Deduct balance
            user.balance -= amount;
            user.spending.total += amount;
            user.spending.today += amount;

            // Update subscription
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month

            user.subscription = {
                status: 'pro',
                expiresAt
            };

            await user.save({ session });

            // Create Transaction Record
            await Transaction.create([{
                userId,
                amount,
                type: 'debit',
                category: 'payment', // or subscription
                description: 'Pro Subscription (1 Month)'
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return user;

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    /**
     * Process cashout request
     */
    async cashout(userId, amount) {
        const session = await User.startSession();
        session.startTransaction();

        try {
            const user = await User.findById(userId).session(session);
            if (!user) throw new Error('User not found');

            if (amount <= 0) throw new Error('Invalid amount');

            if (user.balance < amount) {
                throw new Error('Insufficient balance');
            }

            // Deduct balance immediately
            user.balance -= amount;
            await user.save({ session });

            // Create Transaction Record (Withdrawal)
            // We mark it as 'pending' status if we want manual approval, 
            // but for now let's just record it as a debit 'withdrawal'.
            await Transaction.create([{
                userId,
                amount,
                type: 'debit',
                category: 'withdrawal',
                description: 'Cashout Request',
                status: 'pending' // pending until admin approves? or completed if simulated?
            }], { session });

            await session.commitTransaction();
            session.endSession();

            return { balance: user.balance };

        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }
}

module.exports = new TransactionService();
