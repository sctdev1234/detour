/**
 * ---------------------------------------------------------------------------------
 * SERVICE: RecurringScheduler
 * ---------------------------------------------------------------------------------
 * Purpose: Generates TripInstances from ACTIVE recurring TripTemplates.
 * Owner Domain: Trip Domain
 * Canonical Lookahead: 7 days
 * ---------------------------------------------------------------------------------
 */

const TripTemplate = require('../models/TripTemplate');
const TripInstance = require('../models/TripInstance');
const DispatchServiceV2 = require('./v2/dispatchService');

class RecurringScheduler {
    /**
     * Generates TripInstances for the next N days (default 7 days).
     * Fully idempotent, restart-safe, and duplicate-resistant.
     */
    static async generateDailyInstances(lookaheadDays = 7) {
        const runId = `RUN-${Date.now()}`;
        console.log(`[RecurringScheduler] Starting recurring instance generation for ${lookaheadDays} days (Run: ${runId})`);
        
        const now = new Date();
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        let totalGenerated = 0;

        for (let dayOffset = 1; dayOffset <= lookaheadDays; dayOffset++) {
            const targetDate = new Date(now);
            targetDate.setDate(now.getDate() + dayOffset);
            const targetDay = daysMap[targetDate.getDay()];

            // 1. Fetch active templates running on targetDay
            const activeTemplates = await TripTemplate.find({
                schedulingStrategy: 'RECURRING',
                status: 'ACTIVE',
                'recurringConfig.days': targetDay
            }).populate('linkedTemplates.templateId');

            for (const template of activeTemplates) {
                // Check Driver Vacation / Blackout Mode
                if (template.vacationMode && template.vacationMode.active) {
                    if (template.vacationMode.endDate && targetDate > template.vacationMode.endDate) {
                        template.vacationMode.active = false;
                        await template.save();
                    } else {
                        continue; // Skip blackout date
                    }
                }

                if (!template.recurringConfig || !template.recurringConfig.departureTime) {
                    continue;
                }

                // Calculate Scheduled Time
                const [hours, minutes] = template.recurringConfig.departureTime.split(':');
                const scheduledTime = new Date(targetDate);
                scheduledTime.setHours(parseInt(hours, 10));
                scheduledTime.setMinutes(parseInt(minutes, 10));
                scheduledTime.setSeconds(0);
                scheduledTime.setMilliseconds(0);

                // Generate Instance Payload
                const instancePayload = {
                    schemaVersion: 1,
                    templateId: template._id,
                    driverId: template.creatorRole === 'driver' ? template.creatorId : undefined,
                    passengerIds: template.creatorRole === 'passenger' ? [template.creatorId] : [],
                    pickup: template.startPoint,
                    destination: template.endPoint,
                    waypoints: template.waypoints || [],
                    scheduledTime: scheduledTime,
                    seatCapacity: template.recurringConfig.seatCapacity || 4,
                    status: 'DRAFT',
                    generatedBy: 'SCHEDULER',
                    schedulerMetadata: {
                        schedulerVersion: '2.0.0',
                        generationRunId: runId,
                        generatedAt: new Date()
                    },
                    stateTimestamps: {
                        draftAt: new Date()
                    }
                };

                // Pre-reserve seats for linked recurring passengers
                if (template.creatorRole === 'driver' && template.linkedTemplates) {
                    instancePayload.seatReservations = template.linkedTemplates
                        .filter(l => l.role === 'passenger')
                        .map(l => ({
                            passengerId: l.userId,
                            passengerTemplateId: l.templateId?._id || l.templateId,
                            seatsReserved: l.seatsReserved || 1,
                            status: 'CONFIRMED'
                        }));
                }

                // Idempotent Atomic Upsert
                try {
                    const result = await TripInstance.findOneAndUpdate(
                        { templateId: template._id, scheduledTime: scheduledTime },
                        { $setOnInsert: instancePayload },
                        { upsert: true, new: true, rawResult: true }
                    );

                    if (result.lastErrorObject && result.lastErrorObject.updatedExisting) {
                        continue; // Already generated
                    }
                    
                    const generatedInstance = result.value;
                    totalGenerated++;
                    console.log(`[RecurringScheduler] Generated TripInstance: ${generatedInstance._id} for ${scheduledTime.toISOString()}`);

                    // Push passenger requests to dispatch
                    if (template.creatorRole === 'passenger' && generatedInstance) {
                        try {
                            generatedInstance.status = 'SEARCHING';
                            generatedInstance.stateTimestamps.searchingAt = new Date();
                            await generatedInstance.save();
                            
                            await DispatchServiceV2.executeMatchingPipeline(generatedInstance);
                        } catch (err) {
                            console.error(`[RecurringScheduler] Auto-dispatch error for ${generatedInstance._id}:`, err);
                        }
                    }
                } catch (err) {
                    if (err.code !== 11000) {
                        console.error(`[RecurringScheduler] Failed to upsert instance for template ${template._id}:`, err);
                    }
                }
            }
        }
        
        console.log(`[RecurringScheduler] Generation complete. Total generated: ${totalGenerated}`);
        return totalGenerated;
    }
}

module.exports = RecurringScheduler;
