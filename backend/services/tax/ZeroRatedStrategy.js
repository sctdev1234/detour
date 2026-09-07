const TaxStrategy = require('./TaxStrategy');

/**
 * ZeroRatedStrategy
 * 0% VAT applicable.
 * Commission is taken at base rate with zero tax liability.
 */
class ZeroRatedStrategy extends TaxStrategy {
  calculate(grossFare, commissionRate = 0.15, taxRate = 0.0) {
    const grossFareMad = Number(grossFare);
    const commissionGrossAmount = Number((grossFareMad * commissionRate).toFixed(2));
    const taxableAmount = commissionGrossAmount;
    const taxAmount = 0.00;
    const detourNetRevenue = commissionGrossAmount;
    const driverGrossAmount = grossFareMad;
    const driverNetAmount = Number((grossFareMad - commissionGrossAmount).toFixed(2));

    return {
      grossFare: grossFareMad,
      commissionRate,
      taxStrategy: 'ZERO_RATED',
      taxRate: 0.0,
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

module.exports = ZeroRatedStrategy;
