/**
 * ---------------------------------------------------------------------------------
 * CONTROLLER: RecurringController (V2)
 * ---------------------------------------------------------------------------------
 * Purpose: Exposes recurring route management to users.
 * Owner Domain: Trip Domain
 * ---------------------------------------------------------------------------------
 */

const RecurringService = require('../services/recurringService');
const TripTemplate = require('../models/TripTemplate');

exports.createPassengerRecurring = async (req, res) => {
    try {
        const userId = req.user.id;
        const template = await RecurringService.createPassengerRecurring(userId, req.body);
        res.status(201).json({ success: true, data: template });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.createDriverRecurring = async (req, res) => {
    try {
        const userId = req.user.id;
        const template = await RecurringService.createDriverRecurring(userId, req.body);
        res.status(201).json({ success: true, data: template });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getMyTemplates = async (req, res) => {
    try {
        const userId = req.user.id;
        const templates = await TripTemplate.find({ creatorId: userId, status: { $ne: 'ARCHIVED' } });
        res.status(200).json({ success: true, data: templates });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getTemplateDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await TripTemplate.findOne({ _id: id, creatorId: req.user.id }).populate('linkedTemplates.templateId');
        if (!template) return res.status(404).json({ success: false, error: 'Not found' });
        res.status(200).json({ success: true, data: template });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.updateVacationMode = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await RecurringService.updateVacationMode(id, req.user.id, req.body);
        res.status(200).json({ success: true, data: template });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.archiveTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        await RecurringService.archiveTemplate(id, req.user.id);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.linkTemplates = async (req, res) => {
    try {
        const { passengerTemplateId, driverTemplateId, seats } = req.body;
        await RecurringService.linkTemplates(passengerTemplateId, driverTemplateId, seats || 1);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.unlinkTemplates = async (req, res) => {
    try {
        const { passengerTemplateId, driverTemplateId } = req.body;
        await RecurringService.unlinkTemplates(passengerTemplateId, driverTemplateId);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.searchDriverRoutes = async (req, res) => {
    try {
        // e.g. passing a passengerTemplateId to find drivers
        const { passengerTemplateId } = req.query;
        if (!passengerTemplateId) return res.status(400).json({ success: false, error: 'passengerTemplateId required' });
        
        const matches = await RecurringService.findMatchingDrivers(passengerTemplateId);
        res.status(200).json({ success: true, data: matches });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// ... other endpoints like getUpcomingInstances, searchPassengerRoutes
