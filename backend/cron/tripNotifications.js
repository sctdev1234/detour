const cron = require('node-cron');
const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Notification = require('../models/Notification');

// Runs every minute
const scheduleTripNotifications = (io) => {
    console.log('Starting Trip Notifications Cron Job');

    cron.schedule('* * * * *', async () => {
        try {
            // Find trips that are confirmed, partial, or full
            const targetStatuses = ['CONFIRMED', 'FULL', 'PARTIAL'];

            // Current time
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();

            // Find valid trips
            const trips = await Trip.find({
                status: { $in: targetStatuses }
            }).populate({
                path: 'routeId',
                select: 'schedule.time'
            });

            for (const trip of trips) {
                if (!trip.routeId || !trip.routeId.schedule || !trip.routeId.schedule.time) continue;

                const [hours, mins] = trip.routeId.schedule.time.split(':').map(Number);
                const tripMinutes = hours * 60 + mins;

                // Check if trip is exactly 10 minutes away
                const diffMinutes = tripMinutes - nowMinutes;

                if (diffMinutes === 10) {
                    console.log(`Sending 10-minute warning for trip ${trip._id}`);

                    const notificationMsg = "Your detour trip is starting in 10 minutes!";

                    // Notify Driver
                    const driverId = trip.driverId.toString();
                    if (io) {
                        io.to(`user:${driverId}`).emit('trip_notification', {
                            tripId: trip._id,
                            message: notificationMsg,
                            type: 'Driver'
                        });
                    }
                    await Notification.create({
                        recipient: driverId,
                        type: 'status_update',
                        title: 'Trip Starting Soon',
                        message: notificationMsg,
                        data: { tripId: trip._id }
                    });

                    // Notify Clients
                    for (const client of trip.clients) {
                        const clientId = client.userId.toString();
                        if (io) {
                            io.to(`user:${clientId}`).emit('trip_notification', {
                                tripId: trip._id,
                                message: notificationMsg,
                                type: 'Client'
                            });
                        }
                        await Notification.create({
                            recipient: clientId,
                            type: 'status_update',
                            title: 'Trip Starting Soon',
                            message: notificationMsg,
                            data: { tripId: trip._id }
                        });
                    }

                    // To prevent duplicate sends, we could transition trip to STARTING, 
                    // though requirements rely on driver confirmation to start.
                    // For now, this condition is only met exactly once per minute (when diff == 10).
                }
            }

        } catch (error) {
            console.error('Error in trip notifications cron:', error);
        }
    });
};

module.exports = scheduleTripNotifications;
