/**
 * ---------------------------------------------------------------------------------
 * SERVICE: RecurringScoringService
 * ---------------------------------------------------------------------------------
 * Purpose: Evaluates route and schedule overlaps for recurring matches.
 * Owner Domain: Trip Domain / Matching
 * ---------------------------------------------------------------------------------
 */

// Scoring Providers
const GeoScoringProvider = {
    name: 'GeoScoring',
    weight: 0.7,
    score: (passengerTemplate, driverTemplate) => {
        const passStart = passengerTemplate.startPoint.coordinates;
        const passEnd = passengerTemplate.endPoint.coordinates;
        const driverStart = driverTemplate.startPoint.coordinates;
        const driverEnd = driverTemplate.endPoint.coordinates;

        const pickupDist = RecurringScoringService.getHaversineDistance(passStart[1], passStart[0], driverStart[1], driverStart[0]);
        const dropoffDist = RecurringScoringService.getHaversineDistance(passEnd[1], passEnd[0], driverEnd[1], driverEnd[0]);

        const MAX_DIST = 5000;
        const pickupScore = Math.max(0, 100 - ((pickupDist / MAX_DIST) * 100));
        const dropoffScore = Math.max(0, 100 - ((dropoffDist / MAX_DIST) * 100));

        return (pickupScore + dropoffScore) / 2;
    }
};

const TimeScoringProvider = {
    name: 'TimeScoring',
    weight: 0.3,
    score: (passengerTemplate, driverTemplate) => {
        const passTimeStr = passengerTemplate.recurringConfig.departureTime;
        const driverTimeStr = driverTemplate.recurringConfig.departureTime;
        
        if (!passTimeStr || !driverTimeStr) return 0;

        const parseTime = (timeStr) => {
            const [h, m] = timeStr.split(':').map(Number);
            return (h * 60) + m;
        };

        const diff = Math.abs(parseTime(passTimeStr) - parseTime(driverTimeStr));
        if (diff > 60) return 0;
        return Math.max(0, 100 - (diff * (100 / 60)));
    }
};

// Extensible provider array (can be injected via config)
const SCORING_PROVIDERS = [GeoScoringProvider, TimeScoringProvider];

class RecurringScoringService {
    /**
     * Scores a driver template against a passenger template using registered providers.
     * @param {Object} passengerTemplate 
     * @param {Object} driverTemplate 
     * @returns {Object} Score details and overall match percentage
     */
    static scoreMatch(passengerTemplate, driverTemplate) {
        let totalWeightedScore = 0;
        let totalWeight = 0;
        const details = {};

        for (const provider of SCORING_PROVIDERS) {
            const score = provider.score(passengerTemplate, driverTemplate);
            details[provider.name] = score;
            totalWeightedScore += score * provider.weight;
            totalWeight += provider.weight;
        }

        const overallScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;

        return {
            overallScore: Math.round(overallScore),
            ...details,
            isEligible: overallScore >= 50 // Minimum viability threshold
        };
    }

    /**
     * Calculates distance in meters between two lat/lng coordinates (Haversine)
     */
    static getHaversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
}

module.exports = RecurringScoringService;
