/**
 * ---------------------------------------------------------------------------------
 * SERVICE: RecurringService
 * ---------------------------------------------------------------------------------
 * Purpose: Domain service managing Recurring TripTemplates and Linking.
 * Owner Domain: Trip Domain
 * ---------------------------------------------------------------------------------
 */

const TripTemplate = require('../../models/TripTemplate');
const TripInstance = require('../../models/TripInstance');
const RecurringScoringService = require('./pipeline/RecurringScoringService');
const DomainEventBus = require('../events/DomainEventBus');

class RecurringService {
    
    static async createPassengerRecurring(userId, data) {
        const template = new TripTemplate({
            creatorId: userId,
            creatorRole: 'passenger',
            schedulingStrategy: 'RECURRING',
            startPoint: data.startPoint,
            endPoint: data.endPoint,
            status: 'ACTIVE',
            recurringConfig: {
                days: data.days,
                departureTime: data.departureTime,
                seatsReserved: data.seatsReserved || 1
            },
            routeGeometry: data.routeGeometry,
            polylineCache: data.polylineCache
        });
        return await template.save();
    }

    static async createDriverRecurring(userId, data) {
        const template = new TripTemplate({
            creatorId: userId,
            creatorRole: 'driver',
            schedulingStrategy: 'RECURRING',
            startPoint: data.startPoint,
            endPoint: data.endPoint,
            waypoints: data.waypoints || [],
            status: 'ACTIVE',
            recurringConfig: {
                days: data.days,
                departureTime: data.departureTime,
                seatCapacity: data.seatCapacity || 4,
                pricePerSeat: data.pricePerSeat,
                currency: data.currency || 'MAD',
                vehicleId: data.vehicleId
            },
            routeGeometry: data.routeGeometry,
            polylineCache: data.polylineCache
        });
        return await template.save();
    }

    static async updateVacationMode(templateId, userId, { active, startDate, endDate }) {
        const template = await TripTemplate.findOne({ _id: templateId, creatorId: userId });
        if (!template) throw new Error('Template not found');

        template.vacationMode = { active, startDate, endDate };
        return await template.save();
    }

    static async archiveTemplate(templateId, userId) {
        const template = await TripTemplate.findOne({ _id: templateId, creatorId: userId });
        if (!template) throw new Error('Template not found');

        template.status = 'ARCHIVED';
        return await template.save();
    }

    static async linkTemplates(passengerTemplateId, driverTemplateId, seats) {
        const passTemplate = await TripTemplate.findById(passengerTemplateId);
        const driverTemplate = await TripTemplate.findById(driverTemplateId);

        if (!passTemplate || !driverTemplate) throw new Error('Template not found');

        // Add to passenger
        const passLinkExists = passTemplate.linkedTemplates.find(l => l.templateId.toString() === driverTemplateId.toString());
        if (!passLinkExists) {
            passTemplate.linkedTemplates.push({
                templateId: driverTemplateId,
                userId: driverTemplate.creatorId,
                role: 'driver',
                seatsReserved: seats
            });
            await passTemplate.save();
        }

        // Add to driver
        const driverLinkExists = driverTemplate.linkedTemplates.find(l => l.templateId.toString() === passengerTemplateId.toString());
        if (!driverLinkExists) {
            // Check seat capacity atomically using optimistic concurrency
            const currentReserved = driverTemplate.linkedTemplates.reduce((sum, link) => sum + link.seatsReserved, 0);
            const capacity = driverTemplate.recurringConfig.seatCapacity || 4;
            
            if (currentReserved + seats > capacity) {
                throw new Error('Not enough seats available on this recurring route');
            }

            driverTemplate.linkedTemplates.push({
                templateId: passengerTemplateId,
                userId: passTemplate.creatorId,
                role: 'passenger',
                seatsReserved: seats
            });
            // Due to optimisticConcurrency: true on TripTemplate, concurrent saves will fail safely
            await driverTemplate.save();
        }

        DomainEventBus.emit('RecurringTemplatesLinked', {
            passengerId: passTemplate.creatorId,
            driverId: driverTemplate.creatorId,
            passengerTemplateId,
            driverTemplateId,
            seats
        });

        return { success: true };
    }

    static async unlinkTemplates(passengerTemplateId, driverTemplateId) {
        const passTemplate = await TripTemplate.findById(passengerTemplateId);
        const driverTemplate = await TripTemplate.findById(driverTemplateId);

        if (passTemplate) {
            passTemplate.linkedTemplates = passTemplate.linkedTemplates.filter(l => l.templateId.toString() !== driverTemplateId.toString());
            await passTemplate.save();
        }

        if (driverTemplate) {
            driverTemplate.linkedTemplates = driverTemplate.linkedTemplates.filter(l => l.templateId.toString() !== passengerTemplateId.toString());
            await driverTemplate.save();
        }

        return { success: true };
    }

    static async findMatchingDrivers(passengerTemplateId) {
        const passengerTemplate = await TripTemplate.findById(passengerTemplateId);
        if (!passengerTemplate) throw new Error('Passenger template not found');

        const activeDrivers = await TripTemplate.find({
            creatorRole: 'driver',
            schedulingStrategy: 'RECURRING',
            status: 'ACTIVE',
            'vacationMode.active': { $ne: true }
        });

        const matches = [];
        for (const driverTemplate of activeDrivers) {
            const score = RecurringScoringService.scoreMatch(passengerTemplate, driverTemplate);
            if (score.isEligible) {
                matches.push({
                    driverTemplate,
                    score
                });
            }
        }

        return matches.sort((a, b) => b.score.overallScore - a.score.overallScore);
    }
}

module.exports = RecurringService;
