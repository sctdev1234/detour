const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const User = require('../models/User');

class EscrowService {
  /**
   * Lock passenger digital funds in escrow at booking time.
   * @param {ObjectId} passengerId 
   * @param {number} fareAmountMad 
   * @param {ObjectId} journeyId 
   * @param {Object} session - Mongoose session
   */
  async holdDigitalEscrow(passengerId, fareAmountMad, journeyId, session) {
    const amountCentimes = Math.round(fareAmountMad * 100);
    const user = await User.findById(passengerId).session(session);

    if (!user) {
      throw new Error('Passenger not found');
    }

    const currentBalanceCentimes = Math.round((user.walletBalance || 0) * 100);
    if (currentBalanceCentimes < amountCentimes) {
      throw new Error(`Insufficient wallet balance for booking. Required: ${fareAmountMad} MAD, Available: ${user.walletBalance || 0} MAD`);
    }

    // Create Double-Entry Journal
    const journal = new FinancialJournal({
      referenceType: 'ESCROW_HOLD_DIGITAL',
      referenceId: journeyId,
      description: `Escrow hold for digital journey ${journeyId}`,
      totalDebitCentimes: amountCentimes,
      totalCreditCentimes: amountCentimes,
      isBalanced: true,
      metadata: { passengerId, fareAmountMad }
    });
    await journal.save({ session });

    // Debit Client Available Wallet -> Credit Digital Escrow
    const debitEntry = new FinancialLedgerEntry({
      journalId: journal._id,
      accountId: '2000_LIABILITY_CLIENT_WALLET',
      userId: passengerId,
      type: 'DEBIT',
      amountCentimes,
      description: `Hold funds for journey ${journeyId}`
    });

    const creditEntry = new FinancialLedgerEntry({
      journalId: journal._id,
      accountId: '2010_LIABILITY_ESCROW_DIGITAL',
      userId: passengerId,
      type: 'CREDIT',
      amountCentimes,
      description: `Credit escrow pool for journey ${journeyId}`
    });

    await Promise.all([
      debitEntry.save({ session }),
      creditEntry.save({ session })
    ]);

    // Materialized view update
    user.walletBalance = Number(((currentBalanceCentimes - amountCentimes) / 100).toFixed(2));
    user.heldBalance = Number(((Math.round((user.heldBalance || 0) * 100) + amountCentimes) / 100).toFixed(2));
    await user.save({ session });

    return journal;
  }

  /**
   * Lock driver prepaid commission in escrow for cash-on-boarding rides.
   * @param {ObjectId} driverId 
   * @param {number} commissionAmountMad 
   * @param {ObjectId} journeyId 
   * @param {Object} session - Mongoose session
   */
  async holdCashCommission(driverId, commissionAmountMad, journeyId, session) {
    const commissionCentimes = Math.round(commissionAmountMad * 100);
    const minRequiredBalanceMad = 50.00;
    const minRequiredCentimes = Math.round(minRequiredBalanceMad * 100);

    const driver = await User.findById(driverId).session(session);
    if (!driver) {
      throw new Error('Driver not found');
    }

    const currentBalanceCentimes = Math.round((driver.walletBalance || 0) * 100);
    if (currentBalanceCentimes < minRequiredCentimes) {
      throw new Error(`Driver wallet balance below mandatory minimum 50 MAD for cash rides. Current balance: ${driver.walletBalance || 0} MAD`);
    }

    if (currentBalanceCentimes < commissionCentimes) {
      throw new Error(`Driver wallet balance insufficient to cover commission hold of ${commissionAmountMad} MAD`);
    }

    // Create Double-Entry Journal
    const journal = new FinancialJournal({
      referenceType: 'ESCROW_HOLD_CASH_COMMISSION',
      referenceId: journeyId,
      description: `Prepaid commission hold for cash journey ${journeyId}`,
      totalDebitCentimes: commissionCentimes,
      totalCreditCentimes: commissionCentimes,
      isBalanced: true,
      metadata: { driverId, commissionAmountMad }
    });
    await journal.save({ session });

    // Debit Driver Available -> Credit Cash Escrow
    const debitEntry = new FinancialLedgerEntry({
      journalId: journal._id,
      accountId: '2040_LIABILITY_DRIVER_AVAILABLE',
      userId: driverId,
      type: 'DEBIT',
      amountCentimes: commissionCentimes,
      description: `Reserve commission for cash journey ${journeyId}`
    });

    const creditEntry = new FinancialLedgerEntry({
      journalId: journal._id,
      accountId: '2020_LIABILITY_ESCROW_CASH_COMMISSION',
      userId: driverId,
      type: 'CREDIT',
      amountCentimes: commissionCentimes,
      description: `Credit cash commission escrow pool for journey ${journeyId}`
    });

    await Promise.all([
      debitEntry.save({ session }),
      creditEntry.save({ session })
    ]);

    // Materialized view update
    driver.walletBalance = Number(((currentBalanceCentimes - commissionCentimes) / 100).toFixed(2));
    driver.heldBalance = Number(((Math.round((driver.heldBalance || 0) * 100) + commissionCentimes) / 100).toFixed(2));
    await driver.save({ session });

    return journal;
  }
}

module.exports = new EscrowService();
