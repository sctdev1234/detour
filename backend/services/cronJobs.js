const cron = require('node-cron');
const TripTemplate = require('../models/TripTemplate');
const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const User = require('../models/User');
const { transitionState } = require('../utils/stateMachine');

class CronServices {
    static init() {
        // 1. Recurring Instance Generator
        // Runs daily at midnight UTC to generate instances for the next 48 hours
        cron.schedule('0 0 * * *', async () => {
            console.log('[Cron] Running Recurring Instance Generator');
            try {
                // Determine days covering next 48h (simplified logic)
                const now = new Date();
                const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const today = daysMap[now.getDay()];
                
                const nextDate = new Date(now);
                nextDate.setDate(now.getDate() + 1);
                const tomorrow = daysMap[nextDate.getDay()];

                const templates = await TripTemplate.find({
                    status: 'ACTIVE',
                    recurrenceType: 'RECURRING',
                    'schedule.days': { $in: [today, tomorrow] }
                });

                for (const template of templates) {
                    // Logic to calculate exact departure time based on timezone and time string
                    const [hours, minutes] = template.schedule.time.split(':');
                    const instanceDeparture = new Date(now);
                    instanceDeparture.setHours(parseInt(hours, 10));
                    instanceDeparture.setMinutes(parseInt(minutes, 10));
                    
                    // Create instances...
                    await TripInstance.create({
                        templateId: template._id,
                        userId: template.userId,
                        role: template.role,
                        departureTime: instanceDeparture,
                        startPoint: template.startPoint,
                        endPoint: template.endPoint,
                        distanceKm: template.distanceKm,
                        estimatedDurationMin: template.estimatedDurationMin,
                        pricing: {
                            basePrice: template.pricing.amount,
                            serviceFee: template.pricing.amount * 0.15 // Example 15%
                        },
                        status: template.role === 'passenger' ? 'DRAFT' : 'PUBLISHED'
                    });
                }
            } catch (err) {
                console.error('[Cron] Recurring Generator Error:', err);
            }
        });

        // 2. Scheduled Dispatcher
        // Runs every minute to flip DRAFT -> SEARCHING if within 30 mins
        cron.schedule('* * * * *', async () => {
            try {
                const thirtyMinsFromNow = new Date(Date.now() + 30 * 60000);
                
                const instancesToDispatch = await TripInstance.find({
                    status: 'DRAFT',
                    role: 'passenger',
                    departureTime: { $lte: thirtyMinsFromNow }
                });

                for (const instance of instancesToDispatch) {
                    await transitionState(instance, 'SEARCHING');
                    console.log(`[Cron] Dispatched Scheduled TripInstance: ${instance._id}`);
                    // Note: Socket/Notification events would be triggered here to alert matching engine.
                }
            } catch (err) {
                console.error('[Cron] Scheduled Dispatcher Error:', err);
            }
        });

        // 3. Driver Inactivity Monitor
        // Runs every 5 minutes to flip drivers offline if no heartbeat for 15 mins
        cron.schedule('*/5 * * * *', async () => {
            try {
                const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
                const updated = await User.updateMany(
                    { role: 'driver', driverStatus: 'ONLINE', lastHeartbeat: { $lt: fifteenMinsAgo } },
                    { $set: { driverStatus: 'OFFLINE' } }
                );
                if (updated.modifiedCount > 0) {
                    console.log(`[Cron] Flipped ${updated.modifiedCount} inactive drivers to OFFLINE`);
                }
            } catch (err) {
                console.error('[Cron] Driver Inactivity Error:', err);
            }
        });

        // Note: Offer Expiration Sweeper is handled natively by MongoDB TTL index
        // defined in OfferSchema: `OfferSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });`
    }
}

module.exports = CronServices;
