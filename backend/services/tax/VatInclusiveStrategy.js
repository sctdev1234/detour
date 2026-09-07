const TaxStrategy = require('./TaxStrategy');

/**
 * VatInclusiveStrategy
 * The platform commission (e.g. 15%) is VAT-inclusive.
 * Example for 100 MAD fare (15% commission, 20% VAT):
 * Gross Commission = 15.00 MAD
 * Taxable Base = 15.00 / 1.20 = 12.50 MAD
 * VAT Amount = 15.00 - 12.50 = 2.50 MAD
 * Detour Net Revenue = 12.50 MAD
 * Driver Net Earning = 85.00 MAD
 */
class VatInclusiveStrategy extends TaxStrategy {
  calculate(grossFare, commissionRate = 0.15, taxRate = 0.20) {
    const grossFareMad = Number(grossFare);
    const commissionGrossAmount = Number((grossFareMad * commissionRate).toFixed(2));
    
    // Extract VAT from within the commission gross
    const taxableAmount = Number((commissionGrossAmount / (1 + taxRate)).toFixed(2));
    const taxAmount = Number((commissionGrossAmount - taxableAmount).toFixed(2));
    const detourNetRevenue = taxableAmount;
    const driverGrossAmount = grossFareMad;
    const driverNetAmount = Number((grossFareMad - commissionGrossAmount).toFixed(2));

    return {
      grossFare: grossFareMad,
      commissionRate,
      taxStrategy: 'VAT_INCLUSIVE',
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

module.exports = VatInclusiveStrategy;
