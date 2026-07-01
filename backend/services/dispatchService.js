const TripInstance = require('../models/TripInstance');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Trip = require('../models/Trip');
const { transitionState } = require('../utils/stateMachine');

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
            await transitionState(tripInstance, 'CANCELLED_BY_SYSTEM', 'No drivers found within max radius');
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
     * Uses atomic findOneAndUpdate to prevent race conditions (e.g., accepting two offers at once).
     */
    static async acceptOffer(offerId, passengerId) {
        const offer = await Offer.findById(offerId);
        if (!offer || offer.status !== 'PENDING') {
            throw new Error('Offer is no longer available');
        }

        // 1. Lock the TripInstance by transitioning it from OFFERS_OPEN to OFFER_ACCEPTED atomically
        const tripInstance = await TripInstance.findOneAndUpdate(
            { 
                _id: offer.tripInstanceId, 
                userId: passengerId,
                status: 'OFFERS_OPEN' 
            },
            { status: 'OFFER_ACCEPTED' },
            { new: true }
        );

        if (!tripInstance) {
            throw new Error('TripInstance is not open for offers or does not belong to user');
        }

        // 2. Mark this offer as ACCEPTED
        offer.status = 'ACCEPTED';
        await offer.save();

        // 3. Mark all other pending offers for this TripInstance as REJECTED
        await Offer.updateMany(
            { tripInstanceId: tripInstance._id, status: 'PENDING', _id: { $ne: offer._id } },
            { $set: { status: 'REJECTED' } }
        );

        // 4. Create or update the execution Trip for the driver
        // If the driver already has an active execution trip (e.g., carpooling), add the client.
        // For simplicity in this dispatch, we create a new Trip.
        
        const newTrip = new Trip({
            driverId: offer.driverId,
            driverTripInstanceId: null, // Dynamic dispatch, no pre-scheduled template
            status: 'DRIVER_GOING',
            clients: [{
                userId: passengerId,
                tripInstanceId: tripInstance._id,
                price: offer.proposedPrice,
                status: 'WAITING'
            }]
        });
        await newTrip.save();

        // 5. Update TripInstance to DRIVER_ASSIGNED
        tripInstance.executionTripId = newTrip._id;
        await transitionState(tripInstance, 'DRIVER_ASSIGNED');

        // 6. Update Driver Status to BUSY
        await User.findByIdAndUpdate(offer.driverId, { driverStatus: 'BUSY' });

        return { tripInstance, newTrip };
    }
}

module.exports = DispatchService;
