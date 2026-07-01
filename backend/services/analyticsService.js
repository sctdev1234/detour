const User = require('../models/User');

class AnalyticsService {
    async getDriverStats(driverId) {
        const user = await User.findById(driverId).select('stats earnings createdAt');
        if (!user) throw new Error('Driver not found');

        const stats = user.stats || {};
        const totalOffers = (stats.offersAccepted || 0) + (stats.offersIgnored || 0) + (stats.offersRejected || 0);
        const acceptanceRate = totalOffers > 0 ? (stats.offersAccepted / totalOffers) * 100 : 100;

        const totalTrips = (stats.tripsCompleted || 0) + (stats.tripsCancelled || 0);
        const completionRate = totalTrips > 0 ? (stats.tripsCompleted / totalTrips) * 100 : 100;

        return {
            acceptanceRate: Number(acceptanceRate.toFixed(1)),
            completionRate: Number(completionRate.toFixed(1)),
            hoursOnline: stats.hoursOnline || 0,
            tripsCompleted: stats.tripsCompleted || 0,
            earningsTotal: user.earnings?.total || 0,
            memberSince: user.createdAt
        };
    }

    async logOfferAction(driverId, action) {
        // action can be 'accepted', 'ignored', 'rejected'
        const updateField = `stats.offers${action.charAt(0).toUpperCase() + action.slice(1)}`;
        await User.findByIdAndUpdate(driverId, {
            $inc: { [updateField]: 1 }
        });
    }

    async logTripCompletion(driverId, isCancelled = false) {
        const updateField = isCancelled ? 'stats.tripsCancelled' : 'stats.tripsCompleted';
        await User.findByIdAndUpdate(driverId, {
            $inc: { 
                [updateField]: 1,
                'stats.tripsDone': isCancelled ? 0 : 1 
            }
        });
    }
}

module.exports = new AnalyticsService();
