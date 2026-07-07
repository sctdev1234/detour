const express = require('express');
const router = express.Router();
const controller = require('../controllers/recurringController');
const { auth } = require('../middleware/auth');

// Passenger endpoints
router.post('/passenger', auth, controller.createPassengerRecurring);

// Driver endpoints
router.post('/driver', auth, controller.createDriverRecurring);

// Shared endpoints
router.get('/templates', auth, controller.getMyTemplates);
router.get('/template/:id', auth, controller.getTemplateDetails);
router.patch('/template/:id/vacation', auth, controller.updateVacationMode);
router.patch('/template/:id/cancel', auth, controller.archiveTemplate);

// Linking and Search
router.post('/link', auth, controller.linkTemplates);
router.patch('/link/cancel', auth, controller.unlinkTemplates);
router.get('/search/drivers', auth, controller.searchDriverRoutes);

module.exports = router;
