const VatInclusiveStrategy = require('./VatInclusiveStrategy');
const VatExclusiveStrategy = require('./VatExclusiveStrategy');
const ZeroRatedStrategy = require('./ZeroRatedStrategy');

class TaxService {
  constructor() {
    this.strategies = {
      VAT_INCLUSIVE: new VatInclusiveStrategy(),
      VAT_EXCLUSIVE: new VatExclusiveStrategy(),
      ZERO_RATED: new ZeroRatedStrategy()
    };
  }

  /**
   * Get the active default strategy name from environment or fallback
   */
  getActiveStrategyName() {
    return process.env.PLATFORM_TAX_STRATEGY || 'VAT_INCLUSIVE';
  }

  /**
   * Calculate immutable tax and commission snapshot for a passenger fare.
   * @param {number} grossFare - Passenger fare in MAD
   * @param {Object} options - Override strategy, commissionRate, taxRate
   * @returns {Object} TaxSnapshot
   */
  calculateSnapshot(grossFare, options = {}) {
    const strategyName = options.strategy || this.getActiveStrategyName();
    const strategy = this.strategies[strategyName];

    if (!strategy) {
      throw new Error(`Unknown Tax Strategy: ${strategyName}`);
    }

    const commissionRate = options.commissionRate !== undefined 
      ? Number(options.commissionRate) 
      : Number(process.env.PLATFORM_COMMISSION_RATE || 0.15);

    const taxRate = options.taxRate !== undefined 
      ? Number(options.taxRate) 
      : Number(process.env.PLATFORM_TAX_RATE || 0.20);

    return strategy.calculate(grossFare, commissionRate, taxRate);
  }
}

module.exports = new TaxService();
