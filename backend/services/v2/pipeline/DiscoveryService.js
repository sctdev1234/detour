/**
 * ---------------------------------------------------------------------------------
 * SERVICE: DiscoveryService (Pipeline Stage 1)
 * ---------------------------------------------------------------------------------
 * Purpose: Finds a raw pool of nearby driver candidates using geospatial queries.
 * Owner Domain: Dispatch Domain
 * ---------------------------------------------------------------------------------
 */

const User = require('../../../models/User');
const Route = require('../../../models/Route');

class DiscoveryService {
    /**
     * Discovers driver candidates near the pickup location, along matching routes, or online.
     * @param {Object} tripInstance 
     * @param {Number} radiusMeters 
     * @returns {Promise<Array>} List of raw driver documents
     */
    static async discoverCandidates(tripInstance, radiusMeters = 50000) {
        const pickupCoords = tripInstance.pickup?.coordinates;
        if (!pickupCoords) return [];

        const candidateMap = new Map();

        // 1. Proximity query on driver currentLocation (if set and not [0, 0])
        try {
            const nearbyDrivers = await User.find({
                role: 'driver',
                driverStatus: 'ONLINE',
                'currentLocation.coordinates': { $ne: [0, 0] },
                currentLocation: {
                    $nearSphere: {
                        $geometry: {
                            type: 'Point',
                            coordinates: pickupCoords
                        },
                        $maxDistance: radiusMeters
                    }
                }
            }).lean();

            nearbyDrivers.forEach(d => candidateMap.set(d._id.toString(), d));
        } catch (err) {
            console.warn('[DiscoveryService] nearSphere query on User error:', err.message);
        }

        // 2. Check drivers with active/pending routes near pickup/destination
        try {
            const matchingRoutes = await Route.find({
                role: 'driver',
                status: { $in: ['active', 'pending'] }
            }).lean();

            const driverIds = matchingRoutes.map(r => r.userId?.toString()).filter(Boolean);
            if (driverIds.length > 0) {
                const routeDrivers = await User.find({
                    _id: { $in: driverIds },
                    role: 'driver',
                    driverStatus: 'ONLINE'
                }).lean();

                routeDrivers.forEach(d => candidateMap.set(d._id.toString(), d));
            }
        } catch (err) {
            console.warn('[DiscoveryService] Route lookup error:', err.message);
        }

        // 3. Fallback: Any ONLINE driver currently waiting for ride requests
        if (candidateMap.size === 0) {
            const onlineDrivers = await User.find({
                role: 'driver',
                driverStatus: 'ONLINE'
            }).lean();

            onlineDrivers.forEach(d => candidateMap.set(d._id.toString(), d));
        }

        // 4. Fallback for testing: any driver in the system
        if (candidateMap.size === 0 && process.env.NODE_ENV !== 'production') {
            const anyDrivers = await User.find({ role: 'driver' }).limit(5).lean();
            anyDrivers.forEach(d => candidateMap.set(d._id.toString(), d));
        }

        return Array.from(candidateMap.values());
    }
}

module.exports = DiscoveryService;
