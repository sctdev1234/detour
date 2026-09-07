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
     * Settle a trip payment (End-to-End Finance Journey)
     * Lifecycle: UNSETTLED -> SETTLING -> SETTLED | PAYMENT_PENDING
     * Canonical Delegation: Routes through SettlementService with double-entry ledgers and tax snapshots.
     */
    async settleTripPayment(tripInstanceId, existingSession = null) {
        const settlementService = require('./settlementService');
        return await settlementService.settleTripInstance(tripInstanceId, { session: existingSession });
    }

    /**
     * Add funds to user wallet (Cash In)
     */
    async deposit(userId, amount) {
        const user = await User.findByIdAndUpdate(userId, {
            $inc: { balance: amount }
        }, { new: true });
        if (!user) throw new Error('User not found');

        await Transaction.create({
            userId,
            amount,
            type: 'credit',
            category: 'deposit',
            description: 'Wallet deposit'
        });

        // Trigger automatic settlement of any pending trips
        await this.resolvePendingTrips(userId);

        return user.balance;
    }
    /**
     * Subscribe user to Pro plan
     */
    async subscribe(userId) {
        // ... omitted to preserve space but need to keep original code
        const session = await User.startSession();
        session.startTransaction();

        try {
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month

            // Deduct balance and update subscription atomically
            const updatedUser = await User.findOneAndUpdate(
                { _id: userId, balance: { $gte: amount } },
                {
                    $inc: {
                        balance: -amount,
                        'spending.total': amount,
                        'spending.today': amount
                    },
                    $set: {
                        subscription: {
                            status: 'pro',
                            expiresAt
                        }
                    }
                },
                { session, new: true }
            );

            if (!updatedUser) {
                throw new Error('Insufficient balance or User not found');
            }

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
     * Find and attempt to settle all PAYMENT_PENDING trips for a user.
     * To be called automatically after a successful deposit/recharge.
     */
    async resolvePendingTrips(userId) {
        const TripInstance = require('../models/TripInstance');
        const pendingTrips = await TripInstance.find({ 
            passengerIds: userId, 
            financialStatus: 'PAYMENT_PENDING' 
        });

        for (const trip of pendingTrips) {
            await this.settleTripPayment(trip._id);
        }
    }

    /**
     * SPRINT: Admin Operations
     * Request a withdrawal (Driver)
     */
    async processWithdrawalRequest(driverId, amount, paymentMethod, paymentDetails) {
        const user = await User.findById(driverId);
        if (!user) throw new Error('Driver not found');
        if (user.balance < amount || amount <= 0) {
            throw new Error('Insufficient balance or invalid amount');
        }

        const session = await User.startSession();
        session.startTransaction();
        try {
            const updatedUser = await User.findOneAndUpdate(
                { _id: driverId, balance: { $gte: amount } },
                { $inc: { balance: -amount } },
                { session, new: true }
            );

            if (!updatedUser) {
                throw new Error('Insufficient balance or Driver not found');
            }

            const Withdrawal = require('../models/Withdrawal');
            const withdrawal = new Withdrawal({
                user: driverId,
                amount,
                paymentMethod,
                paymentDetails,
                status: 'pending'
            });
            await withdrawal.save({ session });

            await Transaction.create([{
                userId: driverId,
                amount,
                type: 'debit',
                category: 'withdrawal',
                description: 'Withdrawal request',
                status: 'pending'
            }], { session });

            await session.commitTransaction();
            session.endSession();
            return withdrawal;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    /**
     * Approve a withdrawal (Admin)
     */
    async approveWithdrawal(withdrawalId, adminId) {
        const Withdrawal = require('../models/Withdrawal');
        const TransactionStateMachine = require('../state/TransactionStateMachine');
        const session = await Withdrawal.startSession();
        session.startTransaction();

        try {
            const withdrawal = await Withdrawal.findOneAndUpdate(
                { _id: withdrawalId, status: 'pending' },
                { $set: { status: 'approved', adminNote: `Approved by Admin ${adminId}`, proccessedAt: new Date() } },
                { session, new: true }
            );

            if (!withdrawal) {
                throw new Error('Withdrawal not found, not pending, or already processed');
            }

            TransactionStateMachine.validateTransition('pending', 'approved'); // Logically validated by the atomic query

            const tx = await Transaction.findOneAndUpdate(
                { userId: withdrawal.user, category: 'withdrawal', status: 'pending', amount: withdrawal.amount },
                { $set: { status: 'completed' } },
                { session, new: true }
            );
            if (tx) {
                TransactionStateMachine.validateTransition('pending', 'completed');
            }

            await session.commitTransaction();
            session.endSession();

            const DomainEventBus = require('../events/DomainEventBus');
            DomainEventBus.publish('WithdrawalApproved', withdrawal.user, { driverId: withdrawal.user, amount: withdrawal.amount });

            return withdrawal;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    /**
     * Reject a withdrawal (Admin)
     */
    async rejectWithdrawal(withdrawalId, adminNote, adminId) {
        const Withdrawal = require('../models/Withdrawal');
        const TransactionStateMachine = require('../state/TransactionStateMachine');
        const session = await Withdrawal.startSession();
        session.startTransaction();

        try {
            const withdrawal = await Withdrawal.findOneAndUpdate(
                { _id: withdrawalId, status: 'pending' },
                { $set: { status: 'rejected', adminNote: adminNote || `Rejected by Admin ${adminId}`, proccessedAt: new Date() } },
                { session, new: true }
            );

            if (!withdrawal) {
                throw new Error('Withdrawal not found, not pending, or already processed');
            }

            TransactionStateMachine.validateTransition('pending', 'rejected');

            // Refund the driver's balance
            await User.findByIdAndUpdate(withdrawal.user, {
                $inc: { balance: withdrawal.amount }
            }, { session });

            const tx = await Transaction.findOneAndUpdate(
                { userId: withdrawal.user, category: 'withdrawal', status: 'pending', amount: withdrawal.amount },
                { $set: { status: 'failed' } },
                { session, new: true }
            );
            if (tx) {
                TransactionStateMachine.validateTransition('pending', 'failed');
            }

            await session.commitTransaction();
            session.endSession();

            const DomainEventBus = require('../events/DomainEventBus');
            DomainEventBus.publish('WithdrawalRejected', withdrawal.user, { driverId: withdrawal.user, amount: withdrawal.amount, reason: adminNote });
            return withdrawal;
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }

    /**
     * Process a forced refund (Admin)
     * Follows append-only ledger rule. Reverses passenger debit, driver credit, and commission.
     */
    async processRefund(tripInstanceId, adminId, reason) {
        const TripInstance = require('../models/TripInstance');
        const session = await TripInstance.startSession();
        session.startTransaction();

        try {
            const trip = await TripInstance.findById(tripInstanceId).session(session);
            if (!trip) throw new Error('Trip not found');
            if (trip.financialStatus !== 'SETTLED') {
                throw new Error('Only SETTLED trips can be refunded');
            }

            const passengerId = trip.passengerIds[0];
            const driverId = trip.receiptSnapshot?.driverId;
            const amountTotal = trip.receiptSnapshot?.amountTotal || 0;
            const driverEarning = trip.receiptSnapshot?.driverEarning || 0;
            const commissionAmount = trip.receiptSnapshot?.commissionAmount || 0;

            if (!driverId) throw new Error('No driver found in receipt snapshot');

            const passenger = await User.findById(passengerId).session(session);
            const driver = await User.findById(driverId).session(session);

            // Create reversing ledger entries
            const txRecords = [
                {
                    userId: passengerId,
                    amount: amountTotal,
                    type: 'credit',
                    category: 'refund',
                    relatedUserId: driverId,
                    tripInstanceId: trip._id,
                    description: `Refund for trip: ${reason}`,
                    isIrreversible: true
                },
                {
                    userId: driverId,
                    amount: driverEarning,
                    type: 'debit',
                    category: 'refund', // or earning reversal
                    relatedUserId: passengerId,
                    tripInstanceId: trip._id,
                    description: `Refund deduction for trip: ${reason}`,
                    isIrreversible: true
                },
                {
                    userId: driverId,
                    amount: commissionAmount,
                    type: 'credit',
                    category: 'refund', // reversed commission
                    tripInstanceId: trip._id,
                    description: `Commission reversed: ${reason}`,
                    isIrreversible: true
                }
            ];
            await Transaction.insertMany(txRecords, { session });

            // Restore Passenger Balance
            await User.findByIdAndUpdate(passengerId, {
                $inc: {
                    balance: amountTotal,
                    'spending.total': -amountTotal
                }
            }, { session });

            // Deduct Driver Balance (Admin force-refund can result in negative balance)
            await User.findByIdAndUpdate(driverId, {
                $inc: {
                    balance: -driverEarning,
                    'earnings.total': -driverEarning
                }
            }, { session });

            // Mark trip as refunded
            trip.financialStatus = 'REFUNDED';
            await trip.save({ session });

            await session.commitTransaction();
            session.endSession();

            const DomainEventBus = require('../events/DomainEventBus');
            DomainEventBus.publish('TripRefunded', trip._id, { tripId: trip._id, passengerId, driverId, amountTotal, reason });
            
            return { status: 'REFUNDED', amountTotal };
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            throw error;
        }
    }


    /**
     * Process cashout request
     */
    async processRecharge(userId, amount, reference, existingSession = null) {
        if (amount <= 0) throw new Error('Invalid amount');

        const session = existingSession || await User.startSession();
        if (!existingSession) session.startTransaction();

        try {
            const user = await User.findByIdAndUpdate(userId, {
                $inc: { balance: amount }
            }, { session, new: true });
            if (!user) throw new Error('User not found');

            await Transaction.create([{
                userId,
                amount,
                type: 'credit',
                category: 'deposit',
                description: `Recharge: ${reference}`
            }], { session });

            if (!existingSession) {
                await session.commitTransaction();
                session.endSession();
            }

            // Trigger automatic settlement of any pending trips
            // Run outside the recharge transaction to avoid tying their lifecycles
            await this.resolvePendingTrips(userId);

            return { success: true, newBalance: user.balance };
        } catch (error) {
            if (!existingSession) {
                await session.abortTransaction();
                session.endSession();
            }
            throw error;
        }
    }


    async cashout(userId, amount, existingSession = null) {
        const session = existingSession || await User.startSession();
        if (!existingSession) session.startTransaction();

        try {
            if (amount <= 0) throw new Error('Invalid amount');

            const user = await User.findOneAndUpdate(
                { _id: userId, balance: { $gte: amount } },
                { $inc: { balance: -amount } },
                { session, new: true }
            );

            if (!user) {
                throw new Error('Insufficient balance or User not found');
            }

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

            if (!existingSession) {
                await session.commitTransaction();
                session.endSession();
            }

            return { success: true, newBalance: user.balance };

        } catch (error) {
            if (!existingSession) {
                await session.abortTransaction();
                session.endSession();
            }
            throw error;
        }
    }
}

module.exports = new TransactionService();
