const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const tripCompletionEngine = require('../services/tripCompletionEngine');
const journeyService = require('../services/journeyService');
const cancellationService = require('../services/cancellationService');
const disputeService = require('../services/disputeService');
const driverDispatchController = require('../controllers/driverDispatchController');
const tripService = require('../services/tripService');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const DisputeRecord = require('../models/DisputeRecord');
const OutboxEvent = require('../models/OutboxEvent');
const DomainEventBus = require('../events/DomainEventBus');

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

describe('Phase 6: Trip Completion Engine', () => {

    async function createTestTripWithPassengers({ numPassengers = 1, tripStatus = 'STARTED' } = {}) {
        const driver = new User({
            fullName: 'Test Driver',
            email: `driver_${Date.now()}_${Math.random()}@test.com`,
            phone: `+212600${Math.floor(100000 + Math.random() * 900000)}`,
            role: 'driver',
            driverStatus: 'BUSY',
            walletBalance: 200,
            heldBalance: 0,
            pendingEarnings: 0
        });
        await driver.save();

        const trip = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            driverId: driver._id,
            status: tripStatus,
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

        const passengers = [];
        const journeys = [];

        for (let i = 0; i < numPassengers; i++) {
            const passenger = new User({
                fullName: `Test Passenger ${i + 1}`,
                email: `passenger_${i}_${Date.now()}_${Math.random()}@test.com`,
                phone: `+212700${Math.floor(100000 + Math.random() * 900000)}`,
                role: 'client',
                walletBalance: 100,
                heldBalance: 50,
                pendingEarnings: 0
            });
            await passenger.save();
            passengers.push(passenger);

            const journey = new PassengerJourney({
                tripInstanceId: trip._id,
                passengerId: passenger._id,
                status: 'BOARDED',
                verificationOtp: '1234',
                otpConsumed: true,
                pickupWaypointIndex: 0,
                dropoffWaypointIndex: 1,
                seatsBooked: 1,
                fareAmountMad: 50,
                paymentType: 'DIGITAL_ESCROW'
            });
            await journey.save();
            journeys.push(journey);
        }

        return { driver, trip, assignment, passengers, journeys };
    }

    test('1. One passenger: completing single journey drops off and completes TripInstance', async () => {
        const { driver, trip, journeys } = await createTestTripWithPassengers({ numPassengers: 1 });

        const result = await journeyService.dropoffPassenger(journeys[0]._id, { driverId: driver._id });
        expect(result.success).toBe(true);

        const updatedTrip = await TripInstance.findById(trip._id);
        expect(updatedTrip.status).toBe('COMPLETED');
        expect(updatedTrip.stateTimestamps.completedAt).toBeDefined();

        const updatedDriver = await User.findById(driver._id);
        expect(updatedDriver.driverStatus).toBe('ONLINE'); // Driver lock released
    });

    test('2. Multiple passengers: trip remains active until all passengers complete', async () => {
        const { driver, trip, journeys } = await createTestTripWithPassengers({ numPassengers: 2 });

        // Dropoff 1st passenger
        await journeyService.dropoffPassenger(journeys[0]._id, { driverId: driver._id });

        let tripInFlight = await TripInstance.findById(trip._id);
        expect(tripInFlight.status).toBe('STARTED'); // 2nd passenger still boarded!

        // Dropoff 2nd passenger
        await journeyService.dropoffPassenger(journeys[1]._id, { driverId: driver._id });

        const completedTrip = await TripInstance.findById(trip._id);
        expect(completedTrip.status).toBe('COMPLETED');
    });

    test('3. Partial completion: evaluateTripCompletion rejects premature completion when active passenger remains', async () => {
        const { trip, journeys } = await createTestTripWithPassengers({ numPassengers: 2 });

        // Mark 1st journey COMPLETED directly
        journeys[0].status = 'COMPLETED';
        await journeys[0].save();

        const evalResult = await tripCompletionEngine.evaluateTripCompletion(trip._id);
        expect(evalResult.changed).toBe(false);
        expect(evalResult.reason).toBe('PHYSICALLY_ACTIVE_JOURNEYS_REMAIN');

        const unchangedTrip = await TripInstance.findById(trip._id);
        expect(unchangedTrip.status).toBe('STARTED');
    });

    test('4. All completed: evaluateTripCompletion completes TripInstance when all journeys are terminal', async () => {
        const { trip, journeys } = await createTestTripWithPassengers({ numPassengers: 2 });

        journeys[0].status = 'COMPLETED';
        await journeys[0].save();
        journeys[1].status = 'COMPLETED';
        await journeys[1].save();

        const evalResult = await tripCompletionEngine.evaluateTripCompletion(trip._id);
        expect(evalResult.changed).toBe(true);
        expect(evalResult.status).toBe('COMPLETED');

        const completedTrip = await TripInstance.findById(trip._id);
        expect(completedTrip.status).toBe('COMPLETED');
    });

    test('5. Cancelled passenger: trip completes when one is cancelled and the other completed', async () => {
        const { trip, passengers, journeys } = await createTestTripWithPassengers({ numPassengers: 2 });

        // Cancel first journey before boarding (set to BOOKED first to allow cancellation)
        journeys[0].status = 'BOOKED';
        await journeys[0].save();

        await cancellationService.cancelJourney(journeys[0]._id, passengers[0]._id, 'Passenger cancellation');

        // Complete second journey
        journeys[1].status = 'COMPLETED';
        await journeys[1].save();

        const evalResult = await tripCompletionEngine.evaluateTripCompletion(trip._id);
        expect(evalResult.changed).toBe(true);
        expect(evalResult.status).toBe('COMPLETED');

        const updatedTrip = await TripInstance.findById(trip._id);
        expect(updatedTrip.status).toBe('COMPLETED');
    });

    test('6. No-show passenger: trip completes when one is no-show and the other completed', async () => {
        const { driver, trip, journeys } = await createTestTripWithPassengers({ numPassengers: 2 });

        // Mark first journey as DRIVER_ARRIVED then NO_SHOW
        journeys[0].status = 'DRIVER_ARRIVED';
        await journeys[0].save();

        await cancellationService.recordNoShow(journeys[0]._id, driver._id);

        // Complete second journey
        journeys[1].status = 'COMPLETED';
        await journeys[1].save();

        const evalResult = await tripCompletionEngine.evaluateTripCompletion(trip._id);
        expect(evalResult.changed).toBe(true);
        expect(evalResult.status).toBe('COMPLETED');

        const updatedTrip = await TripInstance.findById(trip._id);
        expect(updatedTrip.status).toBe('COMPLETED');
    });

    test('7. Disputed passenger: trip moves to CLOSED_PENDING_DISPUTES, then COMPLETED upon resolution', async () => {
        const { driver, trip, passengers, journeys } = await createTestTripWithPassengers({ numPassengers: 2 });

        // Complete 1st journey
        journeys[0].status = 'COMPLETED';
        await journeys[0].save();

        // 2nd passenger disputes journey
        const disputeRes = await journeyService.disputeJourney({
            journeyId: journeys[1]._id,
            initiatedBy: passengers[1]._id,
            disputeType: 'ROUTE_DEVIATION',
            reason: 'Driver took detour'
        });
        expect(disputeRes.success).toBe(true);

        // Trip should now be in CLOSED_PENDING_DISPUTES
        let pendingTrip = await TripInstance.findById(trip._id);
        expect(pendingTrip.status).toBe('CLOSED_PENDING_DISPUTES');

        // Admin resolves dispute
        const adminId = new mongoose.Types.ObjectId();
        const resolveRes = await disputeService.resolveDispute(
            disputeRes.dispute._id,
            adminId,
            'RESOLVED_REFUND',
            { decisionNotes: 'Full refund granted' }
        );
        expect(resolveRes.success).toBe(true);

        // Trip should now automatically transition to COMPLETED
        const completedTrip = await TripInstance.findById(trip._id);
        expect(completedTrip.status).toBe('COMPLETED');
    });

    test('8. Duplicate worker execution: subsequent evaluation calls return changed: false with zero duplicate events', async () => {
        const { trip, journeys } = await createTestTripWithPassengers({ numPassengers: 1 });

        journeys[0].status = 'COMPLETED';
        await journeys[0].save();

        let eventCount = 0;
        const unsubscribe = DomainEventBus.on('TripCompleted', () => {
            eventCount++;
        });

        // First evaluation: transitions to COMPLETED
        const firstEval = await tripCompletionEngine.evaluateTripCompletion(trip._id);
        expect(firstEval.changed).toBe(true);

        // Second evaluation: already COMPLETED
        const secondEval = await tripCompletionEngine.evaluateTripCompletion(trip._id);
        expect(secondEval.changed).toBe(false);

        // Worker reconciliation call
        const reconResult = await tripCompletionEngine.reconcileStaleTrips();
        expect(reconResult.completedCount).toBe(0);

        // Verify exactly one completion event emitted
        expect(eventCount).toBe(1);

        const outboxEvents = await OutboxEvent.find({
            aggregateType: 'TRIP_INSTANCE',
            aggregateId: trip._id,
            eventType: 'trip.completed'
        });
        expect(outboxEvents.length).toBe(1);
    });

    test('9. Concurrent worker execution: safe under simultaneous evaluation calls', async () => {
        const { trip, journeys } = await createTestTripWithPassengers({ numPassengers: 1 });

        journeys[0].status = 'COMPLETED';
        await journeys[0].save();

        let eventCount = 0;
        DomainEventBus.on('TripCompleted', () => {
            eventCount++;
        });

        // Run 3 concurrent evaluations
        const results = await Promise.all([
            tripCompletionEngine.evaluateTripCompletion(trip._id),
            tripCompletionEngine.evaluateTripCompletion(trip._id),
            tripCompletionEngine.evaluateTripCompletion(trip._id)
        ]);

        const changedCount = results.filter(r => r.changed).length;
        expect(changedCount).toBe(1);

        const completedTrip = await TripInstance.findById(trip._id);
        expect(completedTrip.status).toBe('COMPLETED');
        expect(eventCount).toBe(1);
    });

    test('10. Direct status bypass: updateTripStatus rejects COMPLETED and CLOSED_PENDING_DISPUTES; tripService.completeTrip rejects TripInstance', async () => {
        const { driver, trip } = await createTestTripWithPassengers({ numPassengers: 1 });

        // Attempt 1: driverDispatchController.updateTripStatus with COMPLETED
        let resStatus = null;
        let resBody = null;
        const mockRes = {
            status: (code) => {
                resStatus = code;
                return {
                    json: (data) => { resBody = data; }
                };
            }
        };

        await driverDispatchController.updateTripStatus({
            params: { id: trip._id.toString() },
            body: { status: 'COMPLETED' },
            user: { id: driver._id.toString() }
        }, mockRes);

        expect(resStatus).toBe(400);
        expect(resBody.success).toBe(false);
        expect(resBody.error).toMatch(/prohibited|forbidden/i);

        // Attempt 2: driverDispatchController.updateTripStatus with CLOSED_PENDING_DISPUTES
        await driverDispatchController.updateTripStatus({
            params: { id: trip._id.toString() },
            body: { status: 'CLOSED_PENDING_DISPUTES' },
            user: { id: driver._id.toString() }
        }, mockRes);

        expect(resStatus).toBe(400);
        expect(resBody.success).toBe(false);

        // Attempt 3: tripService.completeTrip on TripInstance
        await expect(
            tripService.completeTrip(driver._id.toString(), trip._id.toString())
        ).rejects.toThrow(/Direct completion of TripInstance is forbidden/);

        // Trip remains unmodified
        const finalTrip = await TripInstance.findById(trip._id);
        expect(finalTrip.status).toBe('STARTED');
    });
});
