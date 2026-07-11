const DomainEventBus = require('./DomainEventBus');
const Trip = require('../models/Trip');
const tripService = require('../services/tripService');

class DispatchListeners {
    static init(io) {
        this.io = io;
        
        DomainEventBus.on('DriverLocationUpdated', async (event) => {
            await this.handleDriverLocationUpdated(event.payload);
        });

        console.log('[DispatchListeners] Initialized and subscribed to DomainEventBus');
    }

    static async handleDriverLocationUpdated({ tripId, driverId, latitude, longitude }) {
        try {
            // Re-evaluate proximity for the legacy Trip model
            const trip = await Trip.findById(tripId).populate('clients.routeId');
            if (trip && trip.driverId.toString() === driverId) {
                trip.clients.forEach(client => {
                    if (client.status === 'WAITING' || client.status === 'READY') {
                        const pickupLat = client.routeId?.startPoint?.latitude;
                        const pickupLng = client.routeId?.startPoint?.longitude;

                        if (pickupLat && pickupLng) {
                            const distMeters = tripService.calculateDistance(latitude, longitude, pickupLat, pickupLng);
                            if (distMeters <= 1000) {
                                DomainEventBus.publish('DriverApproaching', tripId, {
                                    tripId, driverId, clientId: client.userId.toString(), distance: distMeters
                                });
                            }
                        }
                    }
                });
                return;
            }

            // V2 TripInstance check
            const TripInstance = require('../models/TripInstance');
            const TripAssignment = require('../models/TripAssignment');
            const instance = await TripInstance.findById(tripId);
            if (instance && instance.assignmentId) {
                const assignment = await TripAssignment.findById(instance.assignmentId);
                if (assignment && assignment.driverId.toString() === driverId) {
                    const pickupLat = instance.pickup?.coordinates?.[0];
                    const pickupLng = instance.pickup?.coordinates?.[1];
                    
                    if (pickupLat && pickupLng) {
                        const distMeters = tripService.calculateDistance(latitude, longitude, pickupLat, pickupLng);
                        if (distMeters <= 1000) {
                            instance.passengerIds.forEach(passengerId => {
                                DomainEventBus.publish('DriverApproaching', tripId, {
                                    tripId, driverId, clientId: passengerId.toString(), distance: distMeters
                                });
                            });
                        }
                    }
                }
            }

        } catch (error) {
            console.error('[DispatchListeners] Error handling DriverLocationUpdated:', error);
        }
    }
}

module.exports = DispatchListeners;
