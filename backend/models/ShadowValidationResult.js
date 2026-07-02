const mongoose = require('mongoose');

const shadowValidationResultSchema = new mongoose.Schema({
    validationType: {
        type: String,
        enum: ['PRICING', 'STATE', 'DISPATCH', 'ASSIGNMENT', 'NOTIFICATION', 'WALLET'],
        required: true,
        index: true
    },
    correlationId: {
        type: String,
        index: true
    },
    tripId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        index: true
    },
    legacyResult: {
        type: mongoose.Schema.Types.Mixed
    },
    v2Result: {
        type: mongoose.Schema.Types.Mixed
    },
    difference: {
        type: mongoose.Schema.Types.Mixed // Numeric deviation for pricing, string diff for objects, etc.
    },
    severity: {
        type: String,
        enum: ['INFO', 'WARNING', 'CRITICAL'],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['MATCH', 'MISMATCH', 'ERROR'],
        required: true,
        index: true
    },
    
    // Auditability
    migrationVersion: String,
    architectureVersion: {
        type: String,
        default: 'v2'
    },
    schemaVersion: {
        type: Number,
        default: 1
    },
    applicationVersion: String,

    // Performance Metrics
    executionTimeMs: Number,
    memoryUsageMb: Number,

    timestamp: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

// TTL Index for auto-cleanup (e.g., retain for 30 days)
shadowValidationResultSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

const ShadowValidationResult = mongoose.model('ShadowValidationResult', shadowValidationResultSchema);

module.exports = ShadowValidationResult;
