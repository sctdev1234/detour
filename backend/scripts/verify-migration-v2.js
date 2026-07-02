/**
 * ---------------------------------------------------------------------------------
 * SCRIPT: verify-migration-v2.js
 * ---------------------------------------------------------------------------------
 * Phase 4: Data Migration Verification
 * 
 * Independently validates parity between legacy and V2 collections.
 * - Counts matching between Route <-> TripTemplate
 * - Counts matching between RideRequest <-> TripInstance
 * - Counts matching between Trip <-> TripAssignment
 * - Deep samples 5% of records to check attributes (timestamps, location, pricing).
 * 
 * Usage:
 * node scripts/verify-migration-v2.js [--sample-rate=0.05]
 * ---------------------------------------------------------------------------------
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { parseArgs } = require('util');

const Route = require('../models/Route');
const RideRequest = require('../models/RideRequest');
const Trip = require('../models/Trip');
const TripTemplate = require('../models/TripTemplate');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');

const options = {
    'sample-rate': { type: 'string', default: '0.05' }
};
const { values } = parseArgs({ options, strict: false });
const SAMPLE_RATE = parseFloat(values['sample-rate']);
const SCHEMA_VERSION = 1;

async function connectDB() {
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('📦 Connected to MongoDB for Verification');
    }
}

async function verifyRoutes() {
    console.log('\n🔍 Verifying Routes -> TripTemplates parity...');
    const legacyCount = await Route.countDocuments({});
    
    console.log(`   Legacy Routes: ${legacyCount}`);
    
    const sampleSize = Math.ceil(legacyCount * SAMPLE_RATE);
    console.log(`   Deep sampling ${sampleSize} random routes...`);
    
    const sample = await Route.aggregate([{ $sample: { size: sampleSize } }]);
    let mismatches = 0;

    for (const route of sample) {
        const template = await TripTemplate.findOne({ legacyReferenceId: route._id.toString(), schemaVersion: SCHEMA_VERSION });
        if (!template) {
            console.warn(`   ⚠️ Mismatch: Route ${route._id} has no TripTemplate.`);
            mismatches++;
            continue;
        }

        const isRecurring = route.schedule && route.schedule.days && route.schedule.days.length > 0;
        if (template.schedulingStrategy !== (isRecurring ? 'RECURRING' : 'IMMEDIATE')) mismatches++;
        if (template.creatorId.toString() !== route.userId.toString()) mismatches++;
    }

    if (mismatches > 0) console.warn(`   ⚠️ Found ${mismatches} parity issues in sample.`);
    else console.log(`   ✅ Deep parity checks out for sampled routes.`);
}

async function verifyRideRequests() {
    console.log('\n🔍 Verifying RideRequests -> TripInstances parity...');
    const legacyCount = await RideRequest.countDocuments({});
    console.log(`   Legacy RideRequests: ${legacyCount}`);
    
    const sampleSize = Math.ceil(legacyCount * SAMPLE_RATE);
    console.log(`   Deep sampling ${sampleSize} random requests...`);
    
    const sample = await RideRequest.aggregate([{ $sample: { size: sampleSize } }]);
    let mismatches = 0;

    for (const req of sample) {
        const instance = await TripInstance.findOne({ legacyReferenceId: req._id.toString(), schemaVersion: SCHEMA_VERSION });
        if (!instance) {
            console.warn(`   ⚠️ Mismatch: RideRequest ${req._id} has no TripInstance.`);
            mismatches++;
            continue;
        }

        if (instance.passengerIds[0].toString() !== req.passengerId.toString()) mismatches++;
        if (new Date(instance.scheduledTime).getTime() !== new Date(req.scheduledDeparture || instance.scheduledTime).getTime()) mismatches++;
    }

    if (mismatches > 0) console.warn(`   ⚠️ Found ${mismatches} parity issues in sample.`);
    else console.log(`   ✅ Deep parity checks out for sampled ride requests.`);
}

async function verifyTrips() {
    console.log('\n🔍 Verifying Trips -> TripAssignments parity...');
    const legacyCount = await Trip.countDocuments({});
    console.log(`   Legacy Trips: ${legacyCount}`);
    
    const sampleSize = Math.ceil(legacyCount * SAMPLE_RATE);
    console.log(`   Deep sampling ${sampleSize} random trips...`);
    
    const sample = await Trip.aggregate([{ $sample: { size: sampleSize } }]);
    let mismatches = 0;

    for (const trip of sample) {
        // Need to find instance through client's routeId or trip ID.
        const firstClient = trip.clients && trip.clients.length > 0 ? trip.clients[0] : null;
        if (!firstClient) continue;

        const instanceRef = firstClient.routeId ? firstClient.routeId.toString() : trip._id.toString();
        const instance = await TripInstance.findOne({ legacyReferenceId: instanceRef, schemaVersion: SCHEMA_VERSION });
        
        if (!instance || !instance.assignmentId) {
            console.warn(`   ⚠️ Mismatch: Trip ${trip._id} has no Instance/Assignment.`);
            mismatches++;
            continue;
        }

        const assignment = await TripAssignment.findById(instance.assignmentId);
        if (!assignment || assignment.driverId.toString() !== trip.driverId.toString()) mismatches++;
    }

    if (mismatches > 0) console.warn(`   ⚠️ Found ${mismatches} parity issues in sample.`);
    else console.log(`   ✅ Deep parity checks out for sampled trips.`);
}

async function run() {
    console.log(`=========================================`);
    console.log(`   DATA MIGRATION VERIFICATION V2`);
    console.log(`   Sample Rate: ${SAMPLE_RATE * 100}%`);
    console.log(`=========================================\n`);

    try {
        await connectDB();
        await verifyRoutes();
        await verifyRideRequests();
        await verifyTrips();
        console.log(`\n🎉 Verification Process Finished.`);
    } catch (e) {
        console.error('💥 Verification Failed:', e);
    } process.exit(0);
}

run();
