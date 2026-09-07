const DomainEventBus = require('./DomainEventBus');
const Trip = require('../models/Trip');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');
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
            // 1. Re-evaluate proximity for legacy Trip model if active
            const trip = await Trip.findById(tripId).populate('clients.routeId');
            if (trip && trip.driverId && trip.driverId.toString() === driverId) {
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

            // 2. Canonical V2 TripInstance check
            const instance = await TripInstance.findById(tripId);
            if (instance && (instance.driverId?.toString() === driverId || instance.assignmentId)) {
                // GeoJSON coordinates standard: [longitude, latitude]
                const pickupLng = instance.pickup?.coordinates?.[0];
                const pickupLat = instance.pickup?.coordinates?.[1];
                
                if (pickupLat !== undefined && pickupLng !== undefined) {
                    const distMeters = tripService.calculateDistance(latitude, longitude, pickupLat, pickupLng);
                    if (distMeters <= 1000) {
                        const passengerList = instance.passengerIds || [];
                        passengerList.forEach(passengerId => {
                            DomainEventBus.publish('DriverApproaching', tripId, {
                                tripId, driverId, clientId: passengerId.toString(), distance: distMeters
                            });
                        });
                    }
                }
            }

        } catch (error) {
            console.error('[DispatchListeners] Error handling DriverLocationUpdated:', error);
        }
    }
}

module.exports = DispatchListeners;
