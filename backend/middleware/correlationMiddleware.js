const crypto = require('crypto');
const context = require('../utils/context');

/**
 * Middleware to intercept requests, generate correlation ID, 
 * and initialize the minimal request-scoped AsyncLocalStorage context.
 */
const correlationMiddleware = (req, res, next) => {
    // Accept incoming correlation ID for distributed tracing (e.g. from frontend or API gateway)
    const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
    const requestId = crypto.randomUUID();
    const requestStartTime = Date.now();

    // Set on response header
    res.setHeader('X-Correlation-ID', correlationId);

    // Initial context (Minimal)
    const store = {
        correlationId,
        requestId,
        requestStartTime,
        // These will be populated later by the auth middleware if authenticated
        authenticatedUserId: null, 
        userRole: null,
        tenantId: 'default' // Future multi-tenancy
    };

    context.runWithContext(store, () => {
        next();
    });
};

module.exports = correlationMiddleware;
