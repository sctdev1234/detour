/**
 * ---------------------------------------------------------------------------------
 * SERVICE: EligibilityService (Pipeline Stage 2)
 * ---------------------------------------------------------------------------------
 * Purpose: Filters candidates based on hard constraints (Verification, Presence).
 * Owner Domain: Dispatch Domain
 * ---------------------------------------------------------------------------------
 */

class EligibilityService {
    /**
     * Filters out drivers who are offline, busy, or suspended.
     * @param {Array} candidates 
     * @returns {Array} Eligible candidates
     */
    static filterEligible(candidates) {
        return candidates.filter(driver => {
            // Assuming future identity presence separation
            // return driver.presence === 'ONLINE' && driver.verification === 'APPROVED';
            return true; // Stubbed for initial pipeline alignment
        });
    }
}

module.exports = EligibilityService;
