const TripInstance = require('../models/TripInstance');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Trip = require('../models/Trip');
const TripStateMachine = require('../state/TripStateMachine');
const ShadowValidator = require('../utils/ShadowValidator');

class DispatchService {
    /**
     * Find eligible drivers for a passenger's TripInstance.
     * Uses 2dsphere $geoNear to find drivers who are ONLINE and within searchRadius.
     */
    static async findEligibleDrivers(tripInstance) {
        if (tripInstance.status !== 'SEARCHING') {
            throw new Error('TripInstance is not in SEARCHING state');
        }

        const [lng, lat] = tripInstance.startPoint.coordinates;
        const radiusInMeters = tripInstance.searchRadius;

        // In a real production system with Redis, driver locations are pulled from Redis.
        // For this MongoDB implementation, we assume driver's latest location is saved in User or a Location collection.
        // Since we unified architecture, we can look for Drivers with 'ONLINE' status 
        // who have published their location. Assuming `lastLocation` on User model.

        const eligibleDrivers = await User.find({
            role: 'driver',
            driverStatus: 'ONLINE',
            // Basic vehicle/document checks would go here
            isVerified: true,
            lastLocation: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [lng, lat]
                    },
                    $maxDistance: radiusInMeters
                }
            }
        }).limit(20);

        return eligibleDrivers;
    }

    /**
     * Expand the search radius if no drivers are found, and transition status to system failure if max radius reached.
     */
    static async expandSearchRadius(tripInstanceId) {
        const tripInstance = await TripInstance.findById(tripInstanceId);
        if (!tripInstance || tripInstance.status !== 'SEARCHING') return;

        const MAX_RADIUS = 10000; // 10km
        
        if (tripInstance.searchRadius >= MAX_RADIUS) {
            console.log(`[Dispatch] Max radius reached for TripInstance ${tripInstanceId}. Failing.`);
            TripStateMachine.validateTransition(tripInstance.status, TripStateMachine.STATES.CANCELLED);
            tripInstance.status = TripStateMachine.STATES.CANCELLED;
            tripInstance.cancellationReason = 'No drivers found within max radius';
            tripInstance.stateTimestamps = tripInstance.stateTimestamps || {};
            tripInstance.stateTimestamps.cancelledAt = new Date();
            await tripInstance.save();
            
            // [Phase 5: Parallel Validation] Shadow match the state transition
            ShadowValidator.validateStateTransition(tripInstance, 'CANCELLED_BY_SYSTEM');
            return null;
        }

        // Expand by 2km
        tripInstance.searchRadius += 2000;
        await tripInstance.save();
        
        console.log(`[Dispatch] Expanded radius to ${tripInstance.searchRadius}m for TripInstance ${tripInstanceId}.`);
        return tripInstance;
    }

    /**
     * Passenger accepts a specific offer.
     * Delegates to canonical OfferAcceptanceEngine.
     */
    static async acceptOffer(offerId, passengerId) {
        const OfferAcceptanceEngine = require('./offerAcceptanceEngine');
        const assignment = await OfferAcceptanceEngine.acceptOfferAtomic(offerId, passengerId);
        return { tripInstance: assignment.tripInstance, tripAssignment: assignment, newTrip: assignment };
    }
}

module.exports = DispatchService;
