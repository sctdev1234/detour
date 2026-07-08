/**
 * ---------------------------------------------------------------------------------
 * SERVICE: DiscoveryService (Pipeline Stage 1)
 * ---------------------------------------------------------------------------------
 * Purpose: Finds a raw pool of nearby driver candidates using geospatial queries.
 * Owner Domain: Dispatch Domain
 * ---------------------------------------------------------------------------------
 */

const User = require('../../../models/User'); // Assuming driver data is here

class DiscoveryService {
    /**
     * Discovers raw driver candidates near the pickup location.
     * @param {Object} tripInstance 
     * @param {Number} radiusMeters 
     * @returns {Promise<Array>} List of raw driver documents
     */
    static async discoverCandidates(tripInstance, radiusMeters = 5000) {
        // Query relies on the 2dsphere index of driver locations
        // This is a naive stub for the architectural pipeline.
        const candidates = await User.find({
            role: 'driver',
            currentLocation: {
                $nearSphere: {
                    $geometry: {
                        type: 'Point',
                        coordinates: tripInstance.pickup.coordinates
                    },
                    $maxDistance: radiusMeters
                }
            }
        }).lean();

        return candidates;
    }
}

module.exports = DiscoveryService;
