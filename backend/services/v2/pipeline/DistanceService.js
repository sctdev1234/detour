/**
 * ---------------------------------------------------------------------------------
 * SERVICE: DistanceService (Pipeline Stage 3)
 * ---------------------------------------------------------------------------------
 * Purpose: Calculates precise ETA and route distance for filtered candidates.
 * Owner Domain: Dispatch Domain
 * ---------------------------------------------------------------------------------
 */

class DistanceService {
    /**
     * Attaches precise ETA metrics to candidates.
     * @param {Array} candidates 
     * @param {Object} pickupLocation 
     * @returns {Array} Candidates mapped with distance and ETA
     */
    static calculateETAs(candidates, pickupLocation) {
        return candidates.map(driver => {
            // Stubbed distance calculation. 
            // In production, this might hit OSRM or Google Maps Distance Matrix.
            return {
                driverId: driver._id,
                vehicleId: driver.vehicleId || null,
                distanceMeters: 2500, 
                etaSeconds: 300 
            };
        });
    }
}

module.exports = DistanceService;
