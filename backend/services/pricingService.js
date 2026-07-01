/**
 * ---------------------------------------------------------------------------------
 * SERVICE: PricingService
 * ---------------------------------------------------------------------------------
 * Purpose: Independent pricing domain logic. Calculates deterministic pricing 
 *          snapshots for trip templates.
 * Owner Domain: Pricing Domain
 * ---------------------------------------------------------------------------------
 */

class PricingService {
    /**
     * Generates a deterministic, immutable pricing snapshot for a given template.
     * @param {Object} tripTemplate 
     * @param {Number} distanceKm - Estimated distance
     * @param {Number} durationMin - Estimated duration
     * @returns {Object} pricingSnapshot
     */
    static generateSnapshot(tripTemplate, distanceKm, durationMin) {
        // Base simplistic calculation for now. 
        // Architecture allows this to hit external surge/promo engines later without changing Dispatch.
        
        const BASE_FARE = 10; // MAD
        const PER_KM_RATE = 5;
        const PER_MIN_RATE = 1;
        const COMMISSION_RATE = 0.15; // 15%
        
        // Example dynamic logic based on schedulingStrategy
        let strategyMultiplier = 1;
        if (tripTemplate.schedulingStrategy === 'SCHEDULED') {
            strategyMultiplier = 1.2; // Premium for scheduling
        }

        const distanceFare = distanceKm * PER_KM_RATE * strategyMultiplier;
        const timeFare = durationMin * PER_MIN_RATE;
        const subtotal = BASE_FARE + distanceFare + timeFare;
        
        const commission = subtotal * COMMISSION_RATE;
        const taxes = subtotal * 0.20; // 20% VAT
        
        return {
            baseFare: BASE_FARE,
            distanceFare: parseFloat(distanceFare.toFixed(2)),
            timeFare: parseFloat(timeFare.toFixed(2)),
            commission: parseFloat(commission.toFixed(2)),
            taxes: parseFloat(taxes.toFixed(2)),
            currency: 'MAD',
            pricingVersion: 'v1.0'
        };
    }
}

module.exports = PricingService;
