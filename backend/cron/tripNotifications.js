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
            // Also we should ensure they haven't already transitioned to STARTING_SOON
            const targetStatuses = ['CONFIRMED', 'FULL', 'PARTIAL'];

            // Current time in minutes from midnight local time
            // In a real production app, we should use UTC and check the specific day of the week
            const now = new Date();
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            // Optional: Get current day of week to match the route schedule (e.g. 'Monday')
            const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const todayStr = daysOfWeek[now.getDay()];

            // Find valid trips
            const trips = await Trip.find({
                status: { $in: targetStatuses }
            }).populate({
                path: 'routeId',
                select: 'schedule.time schedule.days'
            });

            for (const trip of trips) {
                if (!trip.routeId || !trip.routeId.schedule || !trip.routeId.schedule.time) continue;

                // Ensure the trip runs today before triggering
                if (trip.routeId.schedule.days && trip.routeId.schedule.days.length > 0) {
                    if (!trip.routeId.schedule.days.includes(todayStr)) continue;
                }

                const [hours, mins] = trip.routeId.schedule.time.split(':').map(Number);
                const tripMinutes = hours * 60 + mins;

                // Check if trip is exactly 10 minutes away
                const diffMinutes = tripMinutes - nowMinutes;

                if (diffMinutes === 10) {
                    console.log(`Sending 10-minute warning for trip ${trip._id}`);

                    // Transition State to STARTING_SOON
                    trip.status = 'STARTING_SOON';
                    await trip.save();

                    const notificationMsg = "Your detour trip is starting in 10 minutes! Please confirm you are ready.";

                    // Notify Driver
                    const driverId = trip.driverId.toString();
                    if (io) {
                        io.to(`user:${driverId}`).emit('trip_starting_soon', {
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
                            io.to(`user:${clientId}`).emit('trip_starting_soon', {
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
                }
            }

        } catch (error) {
            console.error('Error in trip notifications cron:', error);
        }
    });
};

module.exports = scheduleTripNotifications;
