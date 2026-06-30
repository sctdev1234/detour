const socketIo = require('socket.io');
const Trip = require('../models/Trip');
const tripService = require('../services/tripService');

let io;

module.exports = {
    init: (server) => {
        io = socketIo(server, {
            cors: {
                origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
                methods: ["GET", "POST"]
            },
            pingTimeout: 60000, // 1 minute without heartbeat triggers disconnect
            pingInterval: 25000, // Send heartbeat every 25s
        });

        io.on('connection', (socket) => {
            // console.log('New client connected:', socket.id);

            socket.on('join_reclamation', (reclamationId) => {
                socket.join(reclamationId);
            });

            socket.on('leave_reclamation', (reclamationId) => {
                socket.leave(reclamationId);
            });

            socket.on('join_user', (userId) => {
                socket.join(`user:${userId}`);
            });

            socket.on('join_trip', (tripId) => {
                socket.join(`trip:${tripId}`);
            });
            
            socket.on('leave_trip', (tripId) => {
                socket.leave(`trip:${tripId}`);
            });

            // Proximity Tracking
            socket.on('driver_location_update', async (data) => {
                try {
                    const { driverId, tripId, latitude, longitude } = data;
                    if (!driverId || !tripId || !latitude || !longitude) return;

                    // Re-broadcast standard location for clients looking at map
                    socket.to(`trip:${tripId}`).emit('driver_location_changed', { latitude, longitude });

                    // Check proximity
                    const trip = await Trip.findById(tripId).populate('clients.routeId');
                    if (!trip || trip.driverId.toString() !== driverId) return;

                    trip.clients.forEach(client => {
                        if (client.status === 'WAITING' || client.status === 'READY') {
                            const pickupLat = client.routeId?.startPoint?.latitude;
                            const pickupLng = client.routeId?.startPoint?.longitude;

                            if (pickupLat && pickupLng) {
                                const distMeters = tripService.calculateDistance(latitude, longitude, pickupLat, pickupLng);

                                if (distMeters <= 1000) {
                                    io.to(`user:${client.userId.toString()}`).emit('driver_approaching', {
                                        tripId,
                                        driverId,
                                        distance: distMeters
                                    });
                                }
                            }
                        }
                    });
                } catch (err) {
                    console.error('Socket driver_location_update Error:', err);
                }
            });

            socket.on('disconnect', () => {
                // console.log('Client disconnected:', socket.id);
            });
        });

        return io;
    },
    getIo: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
