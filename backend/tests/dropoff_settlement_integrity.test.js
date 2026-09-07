const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const journeyService = require('../services/journeyService');
const settlementService = require('../services/settlementService');
const escrowService = require('../services/escrowService');
const disputeService = require('../services/disputeService');
const earningsClearanceWorker = require('../services/earningsClearanceWorker');
const driverDispatchController = require('../controllers/driverDispatchController');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const DisputeRecord = require('../models/DisputeRecord');
const OutboxEvent = require('../models/OutboxEvent');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    await TripInstance.createCollection();
    await TripAssignment.createCollection();
    await PassengerJourney.createCollection();
    await User.createCollection();
    await FinancialJournal.createCollection();
    await FinancialLedgerEntry.createCollection();
    await DisputeRecord.createCollection();
    await OutboxEvent.createCollection();
}, 120000);

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
}, 60000);

afterEach(async () => {
    await TripInstance.deleteMany({});
    await TripAssignment.deleteMany({});
    await PassengerJourney.deleteMany({});
    await User.deleteMany({});
    await FinancialJournal.deleteMany({});
    await FinancialLedgerEntry.deleteMany({});
    await DisputeRecord.deleteMany({});
    await OutboxEvent.deleteMany({});
});

describe('Phase 5: Dropoff + Settlement Integrity', () => {

    async function createTestFixtures(overrides = {}) {
        const driver = new User({
            fullName: 'Settlement Driver',
            email: `driver_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'driver',
            walletBalance: overrides.driverWallet !== undefined ? overrides.driverWallet : 100,
            heldBalance: overrides.driverHeld !== undefined ? overrides.driverHeld : 0,
            pendingEarnings: overrides.driverPending !== undefined ? overrides.driverPending : 0,
            driverStatus: 'BUSY'
        });
        await driver.save();

        const passenger = new User({
            fullName: 'Settlement Passenger',
            email: `passenger_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'client',
            walletBalance: overrides.passengerWallet !== undefined ? overrides.passengerWallet : 100,
            heldBalance: overrides.passengerHeld !== undefined ? overrides.passengerHeld : 0
        });
        await passenger.save();

        const trip = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            driverId: driver._id,
            status: overrides.tripStatus || 'BOARDED',
            capacity: 4,
            scheduledTime: new Date(),
            pickup: { type: 'Point', coordinates: [-7.5898, 33.5731], address: 'Casablanca' },
            destination: { type: 'Point', coordinates: [-6.8498, 34.0208], address: 'Rabat' }
        });
        await trip.save();

        const assignment = new TripAssignment({
            tripInstanceId: trip._id,
            driverId: driver._id,
            status: 'ACTIVE'
        });
        await assignment.save();

        const fareAmountMad = overrides.fareAmountMad || 100;
        const paymentType = overrides.paymentType || 'DIGITAL_ESCROW';

        const journey = new PassengerJourney({
            tripInstanceId: trip._id,
            passengerId: passenger._id,
            status: overrides.journeyStatus || 'BOARDED',
            verificationOtp: '1234',
            otpConsumed: true,
            pickupWaypointIndex: 0,
            dropoffWaypointIndex: 1,
            seatsBooked: 1,
            fareAmountMad,
            paymentType
        });
        await journey.save();

        // If digital escrow, simulate hold
        if (paymentType === 'DIGITAL_ESCROW' && overrides.simulateHold !== false) {
            passenger.walletBalance -= fareAmountMad;
            passenger.heldBalance += fareAmountMad;
            await passenger.save();
        } else if (paymentType === 'CASH_ON_BOARDING' && overrides.simulateHold !== false) {
            const comm = 15; // 15%
            driver.walletBalance -= comm;
            driver.heldBalance += comm;
            await driver.save();
        }

        return { driver, passenger, trip, assignment, journey };
    }

    test('1. Digital Settlement: dropoff settles journey, credits driver pendingEarnings, decreases passenger heldBalance, and completes trip', async () => {
        const { driver, passenger, trip, journey } = await createTestFixtures({
            paymentType: 'DIGITAL_ESCROW',
            fareAmountMad: 100
        });

        const dropoffRes = await journeyService.dropoffPassenger(journey._id, { driverId: driver._id });
        expect(dropoffRes.success).toBe(true);

        const updatedJourney = await PassengerJourney.findById(journey._id);
        expect(updatedJourney.status).toBe('COMPLETED');
        expect(updatedJourney.driverEarningsPendingAt).toBeDefined();

        // Verify driver & passenger balances
        const updatedDriver = await User.findById(driver._id);
        const updatedPassenger = await User.findById(passenger._id);

        // 100 MAD fare: Net driver earnings = 82 MAD (100 - 15% comm - 3% VAT)
        expect(updatedDriver.pendingEarnings).toBeGreaterThan(0);
        expect(updatedDriver.walletBalance).toBe(100); // Unchanged until cleared
        expect(updatedPassenger.heldBalance).toBe(0); // Released from escrow

        // Verify double-entry journal & ledger entries
        const journal = await FinancialJournal.findOne({ referenceId: journey._id, referenceType: 'TRIP_SETTLEMENT' });
        expect(journal).toBeDefined();
        expect(journal.isBalanced).toBe(true);

        const entries = await FinancialLedgerEntry.find({ journalId: journal._id });
        expect(entries.length).toBe(4); // Debit escrow, Credit revenue, Credit VAT, Credit Driver Pending

        // Trip should now be evaluated to COMPLETED
        const updatedTrip = await TripInstance.findById(trip._id);
        expect(updatedTrip.status).toBe('COMPLETED');
    });

    test('2. Cash Settlement: dropoff releases prepaid cash commission, decreases driver heldBalance', async () => {
        const { driver, trip, journey } = await createTestFixtures({
            paymentType: 'CASH_ON_BOARDING',
            fareAmountMad: 100
        });

        const dropoffRes = await journeyService.dropoffPassenger(journey._id, { driverId: driver._id });
        expect(dropoffRes.success).toBe(true);

        const updatedDriver = await User.findById(driver._id);
        expect(updatedDriver.heldBalance).toBe(0); // Prepaid commission released to revenue

        const journal = await FinancialJournal.findOne({ referenceId: journey._id, referenceType: 'ESCROW_RELEASE_CASH_COMMISSION' });
        expect(journal).toBeDefined();
        expect(journal.isBalanced).toBe(true);

        const updatedJourney = await PassengerJourney.findById(journey._id);
        expect(updatedJourney.status).toBe('COMPLETED');
    });

    test('3. Duplicate Settlement: settlePassengerJourney is strictly idempotent and prevents double-crediting', async () => {
        const { driver, journey } = await createTestFixtures({
            paymentType: 'DIGITAL_ESCROW',
            fareAmountMad: 100,
            journeyStatus: 'DROPPED_OFF'
        });

        // First settlement
        await settlementService.settlePassengerJourney(journey._id, driver._id);
        const driverAfterFirst = await User.findById(driver._id);
        const firstPending = driverAfterFirst.pendingEarnings;

        // Second duplicate settlement call
        const duplicateRes = await settlementService.settlePassengerJourney(journey._id, driver._id);
        expect(duplicateRes.alreadySettled).toBe(true);

        const driverAfterSecond = await User.findById(driver._id);
        expect(driverAfterSecond.pendingEarnings).toBe(firstPending); // No double credit

        const journalsCount = await FinancialJournal.countDocuments({ referenceId: journey._id });
        expect(journalsCount).toBe(1); // No duplicate journal
    });

    test('4. Dropoff Twice: dropoffPassenger rejects second dropoff on already completed/dropped-off journey', async () => {
        const { driver, journey } = await createTestFixtures();

        // First dropoff
        await journeyService.dropoffPassenger(journey._id, { driverId: driver._id });

        // Second dropoff attempt
        await expect(journeyService.dropoffPassenger(journey._id, { driverId: driver._id }))
            .rejects.toThrow(/Illegal.*transition/i);
    });

    test('5. Completion Bypass: updateTripStatus rejects direct transition to COMPLETED', async () => {
        const { driver, trip } = await createTestFixtures();

        const req = {
            params: { id: trip._id.toString() },
            body: { status: 'COMPLETED' },
            user: { id: driver._id.toString() }
        };

        let statusCode = null;
        let responseBody = null;
        const res = {
            status: (code) => { statusCode = code; return res; },
            json: (data) => { responseBody = data; return res; }
        };

        await driverDispatchController.updateTripStatus(req, res);

        expect(statusCode).toBe(400);
        expect(responseBody.success).toBe(false);
        expect(responseBody.error).toMatch(/Direct status transition to COMPLETED is prohibited/i);

        const checkTrip = await TripInstance.findById(trip._id);
        expect(checkTrip.status).toBe('BOARDED'); // Untouched
    });

    test('6. Dispute: opening dispute sets DISPUTED, prevents normal settlement, and blocks earnings clearance', async () => {
        const { driver, journey } = await createTestFixtures({
            paymentType: 'DIGITAL_ESCROW',
            fareAmountMad: 100
        });

        // Open dispute
        await journeyService.disputeJourney({
            journeyId: journey._id,
            initiatedBy: journey.passengerId,
            disputeType: 'FARE_DISAGREEMENT',
            reason: 'Overcharged or route deviated'
        });

        const disputedJourney = await PassengerJourney.findById(journey._id);
        expect(disputedJourney.status).toBe('DISPUTED');

        // Normal settlement must fail on DISPUTED journey
        await expect(settlementService.settlePassengerJourney(journey._id, driver._id))
            .rejects.toThrow(/Cannot settle journey in DISPUTED status/i);

        // Earnings clearance worker must be blocked by unresolved dispute
        const clearanceRes = await earningsClearanceWorker.clearJourneyEarnings(journey._id);
        expect(clearanceRes.cleared).toBe(false);
    });

    test('7. Dispute Refund: admin refund sets refundAmountCentimes correctly and restores passenger balance', async () => {
        const { passenger, trip, journey } = await createTestFixtures({
            paymentType: 'DIGITAL_ESCROW',
            fareAmountMad: 100,
            passengerWallet: 0,
            passengerHeld: 100,
            simulateHold: false
        });

        const dispute = new DisputeRecord({
            passengerJourneyId: journey._id,
            tripInstanceId: trip._id,
            initiatedBy: passenger._id,
            disputeType: 'FARE_DISAGREEMENT',
            reason: 'Driver never showed up',
            status: 'OPEN'
        });
        await dispute.save();

        journey.status = 'DISPUTED';
        journey.disputeId = dispute._id;
        await journey.save();

        const adminId = new mongoose.Types.ObjectId();
        const res = await disputeService.resolveDispute(
            dispute._id,
            adminId,
            'RESOLVED_REFUND',
            { decisionNotes: 'Passenger full refund approved' }
        );

        expect(res.success).toBe(true);

        const updatedDispute = await DisputeRecord.findById(dispute._id);
        expect(updatedDispute.status).toBe('RESOLVED_REFUND');
        expect(updatedDispute.resolution.refundAmountCentimes).toBe(10000); // 100 MAD * 100
        expect(updatedDispute.resolution.driverPayoutCentimes).toBe(0);

        // Passenger wallet balance refunded and held balance cleared
        const updatedPassenger = await User.findById(passenger._id);
        expect(updatedPassenger.walletBalance).toBe(100);
        expect(updatedPassenger.heldBalance).toBe(0);

        const updatedJourney = await PassengerJourney.findById(journey._id);
        expect(updatedJourney.status).toBe('COMPLETED');
    });

    test('8. Earnings Clearance: worker clears pending driver earnings to available wallet balance', async () => {
        const { driver, journey } = await createTestFixtures({
            paymentType: 'DIGITAL_ESCROW',
            fareAmountMad: 100,
            driverWallet: 0,
            driverPending: 0
        });

        // Dropoff settles and places earnings into pending
        await journeyService.dropoffPassenger(journey._id, { driverId: driver._id });

        const driverPending = await User.findById(driver._id);
        const netEarning = driverPending.pendingEarnings;
        expect(netEarning).toBeGreaterThan(0);
        expect(driverPending.walletBalance).toBe(0);

        // Clear earnings via worker
        const clearance = await earningsClearanceWorker.clearJourneyEarnings(journey._id);
        expect(clearance.cleared).toBe(true);

        const driverAfterClear = await User.findById(driver._id);
        expect(driverAfterClear.pendingEarnings).toBe(0);
        expect(driverAfterClear.walletBalance).toBe(netEarning);

        const updatedJourney = await PassengerJourney.findById(journey._id);
        expect(updatedJourney.earningsClearedAt).toBeDefined();
    });

    test('9. Worker Idempotency: second clearance attempt does not double-credit driver wallet', async () => {
        const { driver, journey } = await createTestFixtures({
            paymentType: 'DIGITAL_ESCROW',
            fareAmountMad: 100,
            driverWallet: 0,
            driverPending: 0
        });

        await journeyService.dropoffPassenger(journey._id, { driverId: driver._id });
        await earningsClearanceWorker.clearJourneyEarnings(journey._id);

        const driverFirst = await User.findById(driver._id);
        const balanceFirst = driverFirst.walletBalance;

        // Second run
        const secondRun = await earningsClearanceWorker.clearJourneyEarnings(journey._id);
        expect(secondRun.cleared).toBe(false);
        expect(secondRun.reason).toBe('NOT_ELIGIBLE_OR_ALREADY_CLEARED');

        const driverSecond = await User.findById(driver._id);
        expect(driverSecond.walletBalance).toBe(balanceFirst); // Untouched
    });

    test('10. Canonical Controller Endpoint: POST /v2/dispatch/driver/trip/:id/dropoff succeeds and triggers settlement', async () => {
        const { driver, trip, journey } = await createTestFixtures({
            paymentType: 'DIGITAL_ESCROW',
            fareAmountMad: 100
        });

        const req = {
            params: { id: trip._id.toString() },
            body: { journeyId: journey._id.toString() },
            user: { id: driver._id.toString() }
        };
        let code = null;
        let body = null;
        const res = {
            status: (c) => { code = c; return res; },
            json: (d) => { body = d; return res; }
        };

        await driverDispatchController.dropoffPassenger(req, res);

        expect(code).toBe(200);
        expect(body.success).toBe(true);
        expect(body.data.status).toBe('COMPLETED');

        const updatedTrip = await TripInstance.findById(trip._id);
        expect(updatedTrip.status).toBe('COMPLETED');
    });
});
