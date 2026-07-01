const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const VERSION_INFO = {
    application_version: '1.0.0', // Standardize from package.json in production
    schema_version: 'v1',
    architecture_version: 'ARCH_v1',
    environment: process.env.NODE_ENV || 'development'
};

// Application overall health
router.get('/health', async (req, res) => {
    // Check DB connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'UP' : 'DOWN';
    
    const isHealthy = dbStatus === 'UP';

    res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'UP' : 'DOWN',
        timestamp: new Date().toISOString(),
        checks: {
            database: dbStatus
        }
    });
});

// Pod Readiness Probe
router.get('/ready', (req, res) => {
    // Determine if the server is ready to accept traffic
    // E.g., caching warmed up, required connections established
    const isReady = mongoose.connection.readyState === 1;

    res.status(isReady ? 200 : 503).json({
        ready: isReady,
        timestamp: new Date().toISOString()
    });
});

// Expose Version Info
router.get('/version', (req, res) => {
    res.status(200).json(VERSION_INFO);
});

module.exports = router;
