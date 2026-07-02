const express = require('express');
const router = express.Router();
const shadowDashboardController = require('../controllers/shadowDashboardController');

// Define routes for the shadow validation dashboard
router.get('/dashboard', shadowDashboardController.getDashboardMetrics);
router.get('/health', shadowDashboardController.getHealthStatus);

module.exports = router;
