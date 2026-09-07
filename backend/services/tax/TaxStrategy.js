/**
 * TaxStrategy - Base Strategy Interface for platform tax and commission calculations.
 */
class TaxStrategy {
  /**
   * @param {number} grossFare - Passenger fare in MAD
   * @param {number} commissionRate - e.g. 0.15 for 15%
   * @param {number} taxRate - e.g. 0.20 for 20%
   * @returns {Object} TaxSnapshot calculation
   */
  calculate(grossFare, commissionRate = 0.15, taxRate = 0.20) {
    throw new Error('TaxStrategy.calculate() must be implemented by subclass');
  }
}

module.exports = TaxStrategy;
