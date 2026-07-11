/**
 * ---------------------------------------------------------------------------------
 * SERVICE: RecurringScheduler
 * ---------------------------------------------------------------------------------
 * Purpose: Generates TripInstances from ACTIVE recurring templates.
 * Owner Domain: Trip Domain
 * ---------------------------------------------------------------------------------
 */

const TripTemplate = require('../../models/TripTemplate');
const TripInstance = require('../../models/TripInstance');
const DispatchServiceV2 = require('./v2/dispatchService');

class RecurringScheduler {

    static async generateDailyInstances() {
        const runId = `RUN-${Date.now()}`;
        console.log(`[RecurringScheduler] Starting daily instance generation (Run: ${runId})`);
        
        const now = new Date();
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        // We look at tomorrow's day
        const nextDate = new Date(now);
        nextDate.setDate(now.getDate() + 1);
        const targetDay = daysMap[nextDate.getDay()];
        const targetDateStr = nextDate.toISOString().split('T')[0]; // YYYY-MM-DD

        // 1. Fetch active templates running tomorrow that are not on vacation
        const activeTemplates = await TripTemplate.find({
            schedulingStrategy: 'RECURRING',
            status: 'ACTIVE',
            'recurringConfig.days': targetDay
        }).populate('linkedTemplates.templateId');

        for (const template of activeTemplates) {
            // Check Vacation Mode
            if (template.vacationMode && template.vacationMode.active) {
                if (template.vacationMode.endDate && nextDate > template.vacationMode.endDate) {
                    // Vacation ended, auto-resume
                    template.vacationMode.active = false;
                    await template.save();
                } else {
                    continue; // Skip generation for this template
                }
            }

            // Calculate Scheduled Time with explicit timezone handling
            // Note: In production, use luxon or date-fns-tz to parse this strictly.
            // Here we assume simple local parsing or explicitly passing UTC strings.
            const [hours, minutes] = template.recurringConfig.departureTime.split(':');
            const scheduledTime = new Date(nextDate);
            scheduledTime.setHours(parseInt(hours, 10));
            scheduledTime.setMinutes(parseInt(minutes, 10));
            scheduledTime.setSeconds(0);
            scheduledTime.setMilliseconds(0);
            
            // If timezone is specified, shift appropriately
            if (template.scheduleConfig && template.scheduleConfig.timezone) {
                // Future enhancement: apply timezone offset using the specified string
            }

            // Generate Instance Payload
            let instancePayload = {
                schemaVersion: 1,
                templateId: template._id,
                passengerIds: template.creatorRole === 'passenger' ? [template.creatorId] : [],
                pickup: template.startPoint,
                destination: template.endPoint,
                waypoints: template.waypoints || [],
                scheduledTime: scheduledTime,
                seatCapacity: template.recurringConfig.seatCapacity || 4,
                status: 'DRAFT',
                generatedBy: 'SCHEDULER',
                schedulerMetadata: {
                    schedulerVersion: '1.0.0',
                    generationRunId: runId,
                    generatedAt: new Date()
                },
                stateTimestamps: {
                    draftAt: new Date()
                }
            };

            // If passenger, check if they have linked drivers (candidates)
            if (template.creatorRole === 'passenger') {
                const driverLinks = template.linkedTemplates.filter(l => l.role === 'driver');
                if (driverLinks.length > 0) {
                    instancePayload.candidateDriverIds = driverLinks.map(l => l.userId);
                    // Use the first linked template as the primary driver template constraint
                    instancePayload.driverTemplateId = driverLinks[0].templateId._id;
                }
            } else if (template.creatorRole === 'driver') {
                // Pre-reserve seats for linked passengers
                instancePayload.seatReservations = template.linkedTemplates
                    .filter(l => l.role === 'passenger')
                    .map(l => ({
                        passengerId: l.userId,
                        passengerTemplateId: l.templateId._id,
                        seatsReserved: l.seatsReserved,
                        status: 'CONFIRMED'
                    }));
            }

            // [Phase 3 Resilience Fix] Idempotency Check & Atomic Upsert
            // Avoid duplicate generations when multiple scheduler pods run simultaneously
            let generatedInstance = null;
            try {
                const result = await TripInstance.findOneAndUpdate(
                    { templateId: template._id, scheduledTime: scheduledTime },
                    { $setOnInsert: instancePayload },
                    { upsert: true, new: true, rawResult: true }
                );

                // If `lastErrorObject.updatedExisting` is true, another pod already created it
                if (result.lastErrorObject && result.lastErrorObject.updatedExisting) {
                    console.log(`[RecurringScheduler] Instance already generated for ${template._id} on ${scheduledTime}`);
                    continue; // skip pushing to dispatch
                }
                
                generatedInstance = result.value;
                console.log(`[RecurringScheduler] Generated TripInstance: ${generatedInstance._id}`);
            } catch (err) {
                // Ignore E11000 duplicate key errors if unique index exists
                if (err.code !== 11000) {
                    console.error(`[RecurringScheduler] Failed to upsert instance for template ${template._id}:`, err);
                }
                continue; // skip pushing to dispatch on error
            }

            // If Passenger instance, push to Dispatch Engine for Validation & Offer generation
            // The Dispatch Engine should recognize `candidateDriverIds` and generate offers for them.
            if (template.creatorRole === 'passenger' && generatedInstance) {
                // In a robust system, we might delay this until all driver instances are also generated.
                // For simplicity, we invoke the matching pipeline.
                try {
                    instance.status = 'SEARCHING';
                    instance.stateTimestamps.searchingAt = new Date();
                    await instance.save();
                    
                    await DispatchServiceV2.executeMatchingPipeline(instance);
                } catch (err) {
                    console.error(`[RecurringScheduler] Failed to auto-dispatch instance ${instance._id}:`, err);
                }
            }
        }
        
        console.log('[RecurringScheduler] Daily generation complete');
    }
}

module.exports = RecurringScheduler;
