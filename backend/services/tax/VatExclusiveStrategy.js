const TaxStrategy = require('./TaxStrategy');

/**
 * VatExclusiveStrategy
 * VAT is charged on top of the platform commission (e.g. 15% + 20% VAT on the 15%).
 * Example for 100 MAD fare (15% commission, 20% VAT):
 * Commission Base = 15.00 MAD
 * VAT Amount = 15.00 * 0.20 = 3.00 MAD
 * Commission Gross (Total Deducted) = 18.00 MAD
 * Taxable Base = 15.00 MAD
 * Detour Net Revenue = 15.00 MAD
 * Driver Net Earning = 100 - 18 = 82.00 MAD
 */
class VatExclusiveStrategy extends TaxStrategy {
  calculate(grossFare, commissionRate = 0.15, taxRate = 0.20) {
    const grossFareMad = Number(grossFare);
    const taxableAmount = Number((grossFareMad * commissionRate).toFixed(2));
    const taxAmount = Number((taxableAmount * taxRate).toFixed(2));
    const commissionGrossAmount = Number((taxableAmount + taxAmount).toFixed(2));
    const detourNetRevenue = taxableAmount;
    const driverGrossAmount = grossFareMad;
    const driverNetAmount = Number((grossFareMad - commissionGrossAmount).toFixed(2));

    return {
      grossFare: grossFareMad,
      commissionRate,
      taxStrategy: 'VAT_EXCLUSIVE',
      taxRate,
      commissionGrossAmount,
      taxableAmount,
      taxAmount,
      detourNetRevenue,
      driverGrossAmount,
      driverNetAmount,
      calculatedAt: new Date()
    };
  }
}

module.exports = VatExclusiveStrategy;
