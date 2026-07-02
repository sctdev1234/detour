/**
 * ---------------------------------------------------------------------------------
 * SCRIPT: migrate-trips-v2.js
 * ---------------------------------------------------------------------------------
 * Phase 4: Data Migration (Strangler Architecture)
 * 
 * Maps legacy collections (Route, RideRequest, Trip) to V2 (TripTemplate, TripInstance, TripAssignment).
 * Features:
 * - Upsert logic for Idempotency (keyed by legacyReferenceId and schemaVersion).
 * - Read-Only Runtime Protection for V1 collections.
 * - MigrationRun singleton lock.
 * - Transactions at the batch level.
 * - Performance logging & full reporting.
 * 
 * Usage:
 * node scripts/migrate-trips-v2.js [--dry-run] [--resume] [--batch-size=100] [--confirm-backup-verified]
 * ---------------------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { parseArgs } = require('util');
const fs = require('fs');

const Route = require('../models/Route');
const RideRequest = require('../models/RideRequest');
const Trip = require('../models/Trip');
const TripTemplate = require('../models/TripTemplate');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');
const MigrationRun = require('../models/MigrationRun');

// Parse CLI
const options = {
    'dry-run': { type: 'boolean', default: false },
    'resume': { type: 'boolean', default: false },
    'batch-size': { type: 'string', default: '100' },
    'confirm-backup-verified': { type: 'boolean', default: false }
};
const { values } = parseArgs({ options, strict: false });

const isDryRun = values['dry-run'];
const isResume = values['resume'];
const batchSize = parseInt(values['batch-size'], 10) || 100;
const hasBackup = values['confirm-backup-verified'];
const SCHEMA_VERSION = 1;
const START_TIME = Date.now();

let runDoc = null; // MigrationRun instance
let globalStats = { processed: 0, migrated: 0, skipped: 0, warnings: 0, failures: 0 };
let report = { batches: [] };

/**
 * 1. Read-Only Hook Injection
 */
function enforceReadOnly() {
    const throwReadOnly = () => { throw new Error('READ-ONLY VIOLATION: Migration script attempted to mutate a V1 collection.'); };
    const legacyModels = [Route, RideRequest, Trip];
    legacyModels.forEach(model => {
        model.prototype.save = throwReadOnly;
        model.updateOne = throwReadOnly;
        model.updateMany = throwReadOnly;
        model.deleteOne = throwReadOnly;
        model.deleteMany = throwReadOnly;
        model.findOneAndUpdate = throwReadOnly;
        model.findOneAndDelete = throwReadOnly;
        model.findOneAndReplace = throwReadOnly;
        model.insertMany = throwReadOnly;
        model.create = throwReadOnly;
    });
}

/**
 * 2. Database Connection
 */
async function connectDB() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('📦 Connected to MongoDB');
    }
}

/**
 * 3. Migration Lock & Manifest
 */
async function acquireLock() {
    const runningMigration = await MigrationRun.findOne({ status: 'RUNNING' });
    if (runningMigration) {
        throw new Error('MIGRATION LOCK ACTIVE: Another migration is currently running. Aborting.');
    }

    if (isResume) {
        runDoc = await MigrationRun.findOne({ status: { $in: ['FAILED', 'ABORTED', 'COMPLETED'] } }).sort({ startedAt: -1 });
        if (!runDoc) throw new Error('Cannot resume: No previous migration found.');
        runDoc.status = 'RUNNING';
        runDoc.config.dryRun = isDryRun;
        runDoc.config.batchSize = batchSize;
        runDoc.config.resume = true;
        await runDoc.save();
    } else {
        runDoc = new MigrationRun({
            migrationVersion: 'v2-strangler-p4',
            status: 'RUNNING',
            config: { batchSize, dryRun: isDryRun, resume: false },
            checkpoints: {
                Route: { lastProcessedId: null, lastSuccessfulBatch: 0 },
                RideRequest: { lastProcessedId: null, lastSuccessfulBatch: 0 },
                Trip: { lastProcessedId: null, lastSuccessfulBatch: 0 }
            }
        });
        await runDoc.save();
    }
    console.log(`🔒 Acquired Migration Lock. Run ID: ${runDoc._id}`);
}

async function releaseLock(finalStatus) {
    if (!runDoc) return;
    runDoc.status = finalStatus;
    runDoc.finishedAt = new Date();
    runDoc.duration = Date.now() - START_TIME;
    runDoc.statistics.totalMigrated += globalStats.migrated;
    runDoc.statistics.totalFailures += globalStats.failures;
    runDoc.statistics.totalWarnings += globalStats.warnings;
    runDoc.statistics.totalSkipped += globalStats.skipped;
    await runDoc.save();
    console.log(`🔓 Released Migration Lock. Status: ${finalStatus}`);
}

function logPerformance(batchNum, count, batchStartMs) {
    const durationMs = Date.now() - batchStartMs;
    const docsPerSec = Math.round((count / durationMs) * 1000);
    const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    console.log(`   ⏱️  Batch ${batchNum}: ${durationMs}ms | ${docsPerSec} docs/sec | Mem: ${mem}MB`);
    report.batches.push({ batchNum, durationMs, docsPerSec, count });
}

/**
 * ---------------------------------------------------------------------------------
 * BATCH RUNNER
 * ---------------------------------------------------------------------------------
 */
async function processCollection(collectionName, model, mapFunc) {
    console.log(`\n--- 🚀 Starting ${collectionName} Migration ---`);
    let lastId = runDoc.checkpoints[collectionName].lastProcessedId;
    let batchNumber = runDoc.checkpoints[collectionName].lastSuccessfulBatch + 1;
    let hasMore = true;

    while (hasMore) {
        const query = lastId ? { _id: { $gt: lastId } } : {};
        const records = await model.find(query).sort({ _id: 1 }).limit(batchSize);
        
        if (records.length === 0) {
            hasMore = false;
            break;
        }

        console.log(`[Batch ${batchNumber}] Processing ${records.length} ${collectionName}...`);
        const batchStart = Date.now();
        
        const session = await mongoose.startSession();
        session.startTransaction();

        let latestId = null;
        let batchFailures = 0;

        try {
            for (const doc of records) {
                latestId = doc._id;
                try {
                    await mapFunc(doc, session);
                    globalStats.migrated++;
                } catch (err) {
                    batchFailures++;
                    globalStats.failures++;
                    runDoc.errors.push({ legacyId: doc._id, collectionName, error: err.message });
                    console.error(`   [Error] ${collectionName} ${doc._id}: ${err.message}`);
                }
            }
            
            if (!isDryRun) {
                await session.commitTransaction();
                
                // Save Checkpoint
                runDoc.checkpoints[collectionName].lastProcessedId = latestId;
                runDoc.checkpoints[collectionName].lastSuccessfulBatch = batchNumber;
                await runDoc.save();
            } else {
                await session.abortTransaction();
            }
            session.endSession();

        } catch (fatalErr) {
            await session.abortTransaction();
            session.endSession();
            throw fatalErr;
        }

        logPerformance(batchNumber, records.length, batchStart);
        lastId = latestId;
        batchNumber++;
    }
}

/**
 * ---------------------------------------------------------------------------------
 * MAPPERS
 * ---------------------------------------------------------------------------------
 */
async function mapRoute(route, session) {
    const isRecurring = route.schedule && route.schedule.days && route.schedule.days.length > 0;
    let cronExpression = null;
    
    if (isRecurring) {
        cronExpression = `0 ${route.schedule.time ? route.schedule.time.split(':')[0] : '8'} * * 1-5`; 
    }

    const templateData = {
        schemaVersion: SCHEMA_VERSION,
        creatorId: route.userId,
        creatorRole: route.role === 'driver' ? 'driver' : 'passenger',
        schedulingStrategy: isRecurring ? 'RECURRING' : 'IMMEDIATE',
        startPoint: {
            type: 'Point',
            coordinates: route.startPoint?.coordinates || [0, 0],
            address: route.startPoint?.address || 'Unknown'
        },
        endPoint: {
            type: 'Point',
            coordinates: route.endPoint?.coordinates || [0, 0],
            address: route.endPoint?.address || 'Unknown'
        },
        waypoints: (route.waypoints || []).map(wp => ({
            type: 'Point',
            coordinates: wp.coordinates || [0, 0],
            address: wp.address || 'Unknown'
        })),
        scheduleConfig: isRecurring ? { cronExpression } : undefined,
        status: route.status === 'active' ? 'ACTIVE' : 'ARCHIVED',
        legacyReferenceId: route._id.toString()
    };

    if (!isDryRun) {
        await TripTemplate.findOneAndUpdate(
            { legacyReferenceId: route._id.toString(), schemaVersion: SCHEMA_VERSION },
            { $set: templateData },
            { upsert: true, new: true, runValidators: true, session }
        );
    }
}

async function mapRideRequest(req, session) {
    const templateData = {
        schemaVersion: SCHEMA_VERSION,
        creatorId: req.passengerId,
        creatorRole: 'passenger',
        schedulingStrategy: req.rideType === 'SCHEDULED' ? 'SCHEDULED' : 'IMMEDIATE',
        startPoint: {
            type: 'Point',
            coordinates: req.startPoint?.coordinates || [0, 0],
            address: req.startPoint?.address || 'Unknown'
        },
        endPoint: {
            type: 'Point',
            coordinates: req.endPoint?.coordinates || [0, 0],
            address: req.endPoint?.address || 'Unknown'
        },
        legacyReferenceId: req._id.toString()
    };

    let templateId = mongoose.Types.ObjectId();
    if (!isDryRun) {
        const template = await TripTemplate.findOneAndUpdate(
            { legacyReferenceId: req._id.toString(), schemaVersion: SCHEMA_VERSION },
            { $set: templateData },
            { upsert: true, new: true, runValidators: true, session }
        );
        templateId = template._id;
    }

    const instanceData = {
        schemaVersion: SCHEMA_VERSION,
        templateId: templateId,
        passengerIds: [req.passengerId],
        pickup: templateData.startPoint,
        destination: templateData.endPoint,
        status: req.status === 'DRAFT' ? 'DRAFT' : 
                (req.status === 'CANCELLED' ? 'CANCELLED' : 'SEARCHING'),
        scheduledTime: req.scheduledDeparture || new Date(),
        legacyReferenceId: req._id.toString()
    };

    if (!isDryRun) {
        await TripInstance.findOneAndUpdate(
            { legacyReferenceId: req._id.toString(), schemaVersion: SCHEMA_VERSION },
            { $set: instanceData },
            { upsert: true, new: true, runValidators: true, session }
        );
    }
}

async function mapTrip(trip, session) {
    const firstClient = trip.clients && trip.clients.length > 0 ? trip.clients[0] : null;
    const passengerIds = trip.clients.map(c => c.userId);
    
    if (!firstClient) {
        throw new Error("Trip has no clients.");
    }

    const instanceRef = firstClient.routeId ? firstClient.routeId.toString() : trip._id.toString();
    
    let instanceId = mongoose.Types.ObjectId();
    if (!isDryRun) {
        let instance = await TripInstance.findOne({ legacyReferenceId: instanceRef }).session(session);
        
        if (!instance) {
            instance = await TripInstance.create([{
                schemaVersion: SCHEMA_VERSION,
                templateId: new mongoose.Types.ObjectId(), // Orphaned fallback template
                passengerIds: passengerIds,
                pickup: { type: 'Point', coordinates: [0,0], address: 'Unknown' },
                destination: { type: 'Point', coordinates: [0,0], address: 'Unknown' },
                status: 'COMPLETED',
                scheduledTime: new Date(),
                legacyReferenceId: instanceRef
            }], { session });
            instance = instance[0];
        }
        instanceId = instance._id;
        
        const statusMap = {
            'DRIVER_GOING': 'ASSIGNED',
            'DRIVER_ARRIVED': 'ARRIVED',
            'PASSENGER_BOARDED': 'BOARDED',
            'RIDE_STARTED': 'STARTED',
            'RIDE_COMPLETED': 'COMPLETED',
            'ARCHIVED': 'COMPLETED',
            'CANCELLED': 'CANCELLED'
        };
        instance.status = statusMap[trip.status] || 'COMPLETED';
        
        let assignment = await TripAssignment.findOneAndUpdate(
            { tripInstanceId: instance._id, schemaVersion: SCHEMA_VERSION },
            {
                $set: {
                    driverId: trip.driverId,
                    vehicleId: null, // Per requirement: No placeholder IDs
                    status: trip.status === 'CANCELLED' ? 'CANCELLED' : 'COMPLETED',
                }
            },
            { upsert: true, new: true, runValidators: false, session }
        );

        if (assignment.vehicleId === null) {
            globalStats.warnings++;
            runDoc.warnings.push({ legacyId: trip._id, message: "vehicleId resolved to null." });
        }

        instance.assignmentId = assignment._id;
        await instance.save({ session });
    }
}

/**
 * ---------------------------------------------------------------------------------
 * MAIN
 * ---------------------------------------------------------------------------------
 */
async function run() {
    console.log(`=========================================`);
    console.log(`   DATA MIGRATION V2 (Production Safe)`);
    console.log(`   Dry Run: ${isDryRun}`);
    console.log(`   Resume: ${isResume}`);
    console.log(`   Batch Size: ${batchSize}`);
    console.log(`=========================================\n`);

    if (!hasBackup) {
        console.error("❌ ABORTING: Pre-Migration Snapshot missing.");
        console.error("You must execute this script with --confirm-backup-verified");
        process.exit(1);
    }

    enforceReadOnly(); // Guard against accidental V1 modifications
    await connectDB();

    try {
        await acquireLock();
        
        await processCollection('Route', Route, mapRoute);
        await processCollection('RideRequest', RideRequest, mapRideRequest);
        await processCollection('Trip', Trip, mapTrip);

        await releaseLock('COMPLETED');
        console.log(`\n🎉 Migration Process Finished Successfully.`);
    } catch (e) {
        console.error('\n💥 Migration Process Aborted:', e.message);
        await releaseLock('FAILED');
    }

    // Write Report
    const reportData = {
        runId: runDoc ? runDoc._id : null,
        dryRun: isDryRun,
        durationMs: Date.now() - START_TIME,
        stats: globalStats,
        batches: report.batches
    };
    fs.writeFileSync('./migration_report.json', JSON.stringify(reportData, null, 2));
    console.log(`\n📄 Report saved to migration_report.json`);
    
    process.exit(0);
}

run();
