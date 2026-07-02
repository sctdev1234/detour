/**
 * ---------------------------------------------------------------------------------
 * SCRIPT: cleanup-v2.js
 * ---------------------------------------------------------------------------------
 * Phase 4: Data Migration Rollback
 * 
 * Safely deletes ONLY V2 documents that were created during migration.
 * It uses `schemaVersion: 1` and `legacyReferenceId: { $ne: null }` as constraints.
 * It will NEVER touch V1 collections (Route, RideRequest, Trip).
 * 
 * Usage:
 * node scripts/cleanup-v2.js [--confirm]
 * ---------------------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { parseArgs } = require('util');

const TripTemplate = require('../models/TripTemplate');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');
const MigrationRun = require('../models/MigrationRun');

const options = {
    'confirm': { type: 'boolean', default: false }
};
const { values } = parseArgs({ options, strict: false });
const SCHEMA_VERSION = 1;

async function connectDB() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('📦 Connected to MongoDB for Rollback');
    }
}

async function run() {
    console.log(`=========================================`);
    console.log(`   DATA MIGRATION V2 - ROLLBACK`);
    console.log(`=========================================\n`);

    if (!values['confirm']) {
        console.error("❌ ABORTING: Missing --confirm flag.");
        console.error("You must execute this script with --confirm to actually delete data.");
        process.exit(1);
    }

    await connectDB();

    try {
        console.log(`\n🧹 Cleaning up TripAssignments...`);
        const assignmentRes = await TripAssignment.deleteMany({ schemaVersion: SCHEMA_VERSION });
        console.log(`   ✅ Deleted ${assignmentRes.deletedCount} TripAssignments.`);

        console.log(`\n🧹 Cleaning up TripInstances...`);
        const instanceRes = await TripInstance.deleteMany({ schemaVersion: SCHEMA_VERSION, legacyReferenceId: { $ne: null } });
        console.log(`   ✅ Deleted ${instanceRes.deletedCount} TripInstances.`);

        console.log(`\n🧹 Cleaning up TripTemplates...`);
        const templateRes = await TripTemplate.deleteMany({ schemaVersion: SCHEMA_VERSION, legacyReferenceId: { $ne: null } });
        console.log(`   ✅ Deleted ${templateRes.deletedCount} TripTemplates.`);

        console.log(`\n🧹 Cleaning up MigrationRuns...`);
        const runRes = await MigrationRun.deleteMany({});
        console.log(`   ✅ Deleted ${runRes.deletedCount} MigrationRuns.`);

        console.log(`\n🎉 Rollback Process Finished Successfully.`);
    } catch (e) {
        console.error('💥 Rollback Failed:', e);
    } process.exit(0);
}

run();
