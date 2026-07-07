const cron = require('node-cron');
const TripTemplate = require('../models/TripTemplate');
const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const User = require('../models/User');
const { transitionState } = require('../utils/stateMachine');

class CronServices {
    static init() {
        // 1. Recurring Instance Generator
        // Runs configurable via env var, defaults to 20:00 (evening before)
        const recurringCron = process.env.RECURRING_GENERATION_CRON || '0 20 * * *';
        cron.schedule(recurringCron, async () => {
            console.log('[Cron] Running Recurring Instance Generator');
            try {
                const RecurringScheduler = require('./recurringScheduler');
                await RecurringScheduler.generateDailyInstances();
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
