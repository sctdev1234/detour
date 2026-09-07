const mongoose = require('mongoose');
const Withdrawal = require('../models/Withdrawal');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const User = require('../models/User');
const outboxService = require('./outboxService');

class WithdrawalService {
  /**
   * Driver submits a withdrawal request.
   * Minimum amount: 50.00 MAD.
   */
  async requestWithdrawal(driverId, amountMad, bankDetails = {}, options = {}) {
    const session = options.session || await mongoose.startSession();
    const isExternalSession = !!options.session;

    if (!isExternalSession) session.startTransaction();

    try {
      const amountCentimes = Math.round(amountMad * 100);
      const minCentimes = 5000; // 50.00 MAD

      if (amountCentimes < minCentimes) {
        throw new Error(`Minimum withdrawal amount is 50.00 MAD. Requested: ${amountMad} MAD`);
      }

      const driver = await User.findById(driverId).session(session);
      if (!driver) throw new Error('Driver not found');

      const currentBalanceCentimes = Math.round((driver.walletBalance || 0) * 100);
      if (currentBalanceCentimes < amountCentimes) {
        throw new Error(`Insufficient available balance for withdrawal. Requested: ${amountMad} MAD, Available: ${driver.walletBalance || 0} MAD`);
      }

      const withdrawal = new Withdrawal({
        driverId,
        amount: amountMad,
        bankDetails,
        status: 'PENDING'
      });
      await withdrawal.save({ session });

      // Create Double-Entry Journal for Withdrawal Hold
      const journal = new FinancialJournal({
        referenceType: 'WITHDRAWAL_REQUEST',
        referenceId: withdrawal._id,
        description: `Hold funds for withdrawal request ${withdrawal._id}`,
        totalDebitCentimes: amountCentimes,
        totalCreditCentimes: amountCentimes,
        isBalanced: true
      });
      await journal.save({ session });

      // Debit Driver Available Balance
      const debitDriver = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2040_LIABILITY_DRIVER_AVAILABLE',
        userId: driverId,
        type: 'DEBIT',
        amountCentimes,
        description: `Hold funds for withdrawal ${withdrawal._id}`
      });

      // Credit Operating Platform Cash Pool Hold
      const creditCashPool = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '1000_ASSET_PLATFORM_CASH',
        userId: driverId,
        type: 'CREDIT',
        amountCentimes,
        description: `Pending bank transfer allocation for withdrawal ${withdrawal._id}`
      });

      await Promise.all([debitDriver.save({ session }), creditCashPool.save({ session })]);

      // Deduct from materialized wallet balance
      driver.walletBalance = Number(((currentBalanceCentimes - amountCentimes) / 100).toFixed(2));
      driver.heldBalance = Number(((Math.round((driver.heldBalance || 0) * 100) + amountCentimes) / 100).toFixed(2));
      await driver.save({ session });

      await outboxService.emit('WITHDRAWAL', withdrawal._id, 'withdrawal.requested', {
        withdrawalId: withdrawal._id,
        driverId,
        amountMad
      }, { session });

      if (!isExternalSession) {
        await session.commitTransaction();
        session.endSession();
      }

      return { success: true, withdrawal };
    } catch (err) {
      if (!isExternalSession) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  }

  /**
   * Admin rejects a withdrawal request, restoring funds to driver available balance.
   */
  async rejectWithdrawal(withdrawalId, adminUserId, reason = 'Administrative rejection', options = {}) {
    const session = options.session || await mongoose.startSession();
    const isExternalSession = !!options.session;

    if (!isExternalSession) session.startTransaction();

    try {
      const withdrawal = await Withdrawal.findById(withdrawalId).session(session);
      if (!withdrawal) throw new Error('Withdrawal request not found');

      if (withdrawal.status !== 'PENDING') {
        throw new Error(`Cannot reject withdrawal with status: ${withdrawal.status}`);
      }

      const amountCentimes = Math.round(withdrawal.amount * 100);
      const driver = await User.findById(withdrawal.driverId).session(session);

      // Create Reversal Journal
      const journal = new FinancialJournal({
        referenceType: 'WITHDRAWAL_REVERSAL',
        referenceId: withdrawal._id,
        description: `Reversal of rejected withdrawal ${withdrawal._id}`,
        totalDebitCentimes: amountCentimes,
        totalCreditCentimes: amountCentimes,
        isBalanced: true,
        metadata: { adminUserId, reason }
      });
      await journal.save({ session });

      // Debit Operating Cash Pool
      const debitCashPool = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '1000_ASSET_PLATFORM_CASH',
        userId: withdrawal.driverId,
        type: 'DEBIT',
        amountCentimes,
        description: `Restore cash pool from rejected withdrawal ${withdrawal._id}`
      });

      // Credit Driver Available Balance
      const creditDriver = new FinancialLedgerEntry({
        journalId: journal._id,
        accountId: '2040_LIABILITY_DRIVER_AVAILABLE',
        userId: withdrawal.driverId,
        type: 'CREDIT',
        amountCentimes,
        description: `Restore available balance from rejected withdrawal ${withdrawal._id}`
      });

      await Promise.all([debitCashPool.save({ session }), creditDriver.save({ session })]);

      if (driver) {
        driver.heldBalance = Number(Math.max(0, (driver.heldBalance || 0) - withdrawal.amount).toFixed(2));
        driver.walletBalance = Number(((driver.walletBalance || 0) + withdrawal.amount).toFixed(2));
        await driver.save({ session });
      }

      withdrawal.status = 'REJECTED';
      withdrawal.adminNotes = reason;
      await withdrawal.save({ session });

      await outboxService.emit('WITHDRAWAL', withdrawal._id, 'withdrawal.rejected', {
        withdrawalId: withdrawal._id,
        driverId: withdrawal.driverId,
        reason
      }, { session });

      if (!isExternalSession) {
        await session.commitTransaction();
        session.endSession();
      }

      return { success: true, withdrawal };
    } catch (err) {
      if (!isExternalSession) {
        await session.abortTransaction();
        session.endSession();
      }
      throw err;
    }
  }

  /**
   * Admin marks withdrawal as transferred / completed.
   */
  async approveAndCompleteWithdrawal(withdrawalId, adminUserId, transactionRef, options = {}) {
    const withdrawal = await Withdrawal.findById(withdrawalId);
    if (!withdrawal) throw new Error('Withdrawal request not found');

    if (withdrawal.status !== 'PENDING') {
      throw new Error(`Cannot approve withdrawal with status: ${withdrawal.status}`);
    }

    const driver = await User.findById(withdrawal.driverId);
    if (driver) {
      driver.heldBalance = Number(Math.max(0, (driver.heldBalance || 0) - withdrawal.amount).toFixed(2));
      await driver.save();
    }

    withdrawal.status = 'APPROVED';
    withdrawal.transactionRef = transactionRef;
    withdrawal.approvedBy = adminUserId;
    withdrawal.approvedAt = new Date();
    await withdrawal.save();

    await outboxService.emit('WITHDRAWAL', withdrawal._id, 'withdrawal.payout_completed', {
      withdrawalId: withdrawal._id,
      driverId: withdrawal.driverId,
      amount: withdrawal.amount,
      transactionRef
    });

    return { success: true, withdrawal };
  }
}

module.exports = new WithdrawalService();
