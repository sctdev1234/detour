/**
 * ---------------------------------------------------------------------------------
 * SERVICE: CommissionService
 * ---------------------------------------------------------------------------------
 * Purpose: Centralized logic for calculating platform commissions.
 * Owner Domain: Finance Domain
 * ---------------------------------------------------------------------------------
 */

class CommissionService {
    /**
     * Get the current platform commission rate.
     * Defaults to 15% if not defined in environment variables.
     * @returns {Number}
     */
    static getCommissionRate() {
        if (process.env.COMMISSION_RATE) {
            return parseFloat(process.env.COMMISSION_RATE);
        }
        return 0.15; // 15% default
    }

    /**
     * Calculate commission for a given trip amount.
     * @param {Number} tripAmount 
     * @returns {Object} { commissionAmount, driverEarning, rateApplied }
     */
    static calculateCommission(tripAmount) {
        if (!tripAmount || tripAmount <= 0) {
            return { commissionAmount: 0, driverEarning: 0, rateApplied: this.getCommissionRate() };
        }

        const rate = this.getCommissionRate();
        let commissionAmount = Number((tripAmount * rate).toFixed(2));
        
        // Ensure commission doesn't exceed total amount (edge case)
        if (commissionAmount > tripAmount) {
            commissionAmount = tripAmount;
        }

        const driverEarning = Number((tripAmount - commissionAmount).toFixed(2));

        return {
            commissionAmount,
            driverEarning,
            rateApplied: rate
        };
    }
}

module.exports = CommissionService;
