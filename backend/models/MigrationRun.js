/**
 * ---------------------------------------------------------------------------------
 * MODEL: MigrationRun
 * ---------------------------------------------------------------------------------
 * Purpose: Global audit trail and locking mechanism for V2 data migration.
 * Owner Domain: Platform / Infrastructure
 * ---------------------------------------------------------------------------------
 */

const mongoose = require('mongoose');

const migrationRunSchema = new mongoose.Schema(
    {
        migrationVersion: {
            type: String,
            required: true
        },
        status: {
            type: String,
            enum: ['RUNNING', 'COMPLETED', 'FAILED', 'ABORTED'],
            default: 'RUNNING'
        },
        operator: {
            type: String,
            default: 'system'
        },
        environment: {
            type: String,
            default: process.env.NODE_ENV || 'development'
        },
        startedAt: {
            type: Date,
            default: Date.now
        },
        finishedAt: {
            type: Date
        },
        duration: {
            type: Number // in milliseconds
        },
        config: {
            batchSize: Number,
            dryRun: Boolean,
            resume: Boolean
        },
        statistics: {
            totalMigrated: { type: Number, default: 0 },
            totalSkipped: { type: Number, default: 0 },
            totalWarnings: { type: Number, default: 0 },
            totalFailures: { type: Number, default: 0 }
        },
        checkpoints: {
            Route: {
                lastProcessedId: { type: mongoose.Schema.Types.ObjectId, default: null },
                lastSuccessfulBatch: { type: Number, default: 0 }
            },
            RideRequest: {
                lastProcessedId: { type: mongoose.Schema.Types.ObjectId, default: null },
                lastSuccessfulBatch: { type: Number, default: 0 }
            },
            Trip: {
                lastProcessedId: { type: mongoose.Schema.Types.ObjectId, default: null },
                lastSuccessfulBatch: { type: Number, default: 0 }
            }
        },
        errors: [
            {
                legacyId: { type: mongoose.Schema.Types.ObjectId },
                collectionName: { type: String },
                error: { type: String },
                timestamp: { type: Date, default: Date.now }
            }
        ],
        warnings: [
            {
                legacyId: { type: mongoose.Schema.Types.ObjectId },
                message: { type: String },
                timestamp: { type: Date, default: Date.now }
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model('MigrationRun', migrationRunSchema);
