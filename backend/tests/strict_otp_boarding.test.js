const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const journeyService = require('../services/journeyService');
const driverDispatchController = require('../controllers/driverDispatchController');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
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
    await OutboxEvent.deleteMany({});
});

describe('Phase 4: Strict OTP Boarding Enforcement', () => {

    async function createTestFixtures(overrides = {}) {
        const driver = new User({
            fullName: 'Assigned Driver',
            email: `driver_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'driver'
        });
        await driver.save();

        const passenger = new User({
            fullName: 'Test Passenger',
            email: `passenger_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'client'
        });
        await passenger.save();

        const trip = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            driverId: driver._id,
            status: overrides.tripStatus || 'ARRIVED',
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

        const journey = new PassengerJourney({
            tripInstanceId: trip._id,
            passengerId: passenger._id,
            status: overrides.journeyStatus || 'DRIVER_ARRIVED',
            verificationOtp: overrides.otp !== undefined ? overrides.otp : '4589',
            otpConsumed: overrides.otpConsumed || false,
            pickupWaypointIndex: 0,
            dropoffWaypointIndex: 1,
            seatsBooked: 1,
            fareAmountMad: 50,
            paymentType: 'CASH_ON_BOARDING'
        });
        await journey.save();

        return { driver, passenger, trip, assignment, journey };
    }

    test('1. Correct OTP: successfully transitions journey and trip to BOARDED and consumes OTP', async () => {
        const { driver, passenger, trip, journey } = await createTestFixtures();

        const result = await journeyService.boardPassenger(journey._id, '4589', {
            driverId: driver._id,
            passengerId: passenger._id
        });

        expect(result.status).toBe('BOARDED');
        expect(result.otpConsumed).toBe(true);
        expect(result.verificationOtp).toBeNull();
        expect(result.boardedAt).toBeDefined();

        const updatedTrip = await TripInstance.findById(trip._id);
        expect(updatedTrip.status).toBe('BOARDED');

        const outbox = await OutboxEvent.findOne({ aggregateId: journey._id, eventType: 'passenger.boarded' });
        expect(outbox).toBeDefined();
    });

    test('2. Wrong OTP: throws invalid OTP error and leaves journey unboarded', async () => {
        const { driver, journey } = await createTestFixtures();

        await expect(journeyService.boardPassenger(journey._id, '9999', {
            driverId: driver._id
        })).rejects.toThrow(/Invalid verification OTP code/i);

        const checkJourney = await PassengerJourney.findById(journey._id);
        expect(checkJourney.status).toBe('DRIVER_ARRIVED');
        expect(checkJourney.otpConsumed).toBe(false);
        expect(checkJourney.verificationOtp).toBe('4589');
    });

    test('3. Missing OTP: throws required OTP error', async () => {
        const { driver, journey } = await createTestFixtures();

        await expect(journeyService.boardPassenger(journey._id, '', {
            driverId: driver._id
        })).rejects.toThrow(/Verification OTP code is required/i);

        await expect(journeyService.boardPassenger(journey._id, null, {
            driverId: driver._id
        })).rejects.toThrow(/Verification OTP code is required/i);
    });

    test('4. Replayed OTP: cannot board a second time with the same or any OTP', async () => {
        const { driver, journey } = await createTestFixtures();

        // First boarding
        await journeyService.boardPassenger(journey._id, '4589', { driverId: driver._id });

        // Second attempt (replay)
        await expect(journeyService.boardPassenger(journey._id, '4589', {
            driverId: driver._id
        })).rejects.toThrow(/already boarded|already been consumed/i);
    });

    test('5. Wrong passenger: throws passenger mismatch error', async () => {
        const { driver, journey } = await createTestFixtures();
        const impostorPassenger = new User({
            fullName: 'Impostor',
            email: 'impostor@test.com',
            password: 'hash',
            role: 'client'
        });
        await impostorPassenger.save();

        await expect(journeyService.boardPassenger(journey._id, '4589', {
            driverId: driver._id,
            passengerId: impostorPassenger._id
        })).rejects.toThrow(/Passenger does not match this journey/i);
    });

    test('6. Wrong driver: throws unauthorized driver error', async () => {
        const { journey } = await createTestFixtures();
        const otherDriver = new User({
            fullName: 'Other Driver',
            email: 'otherdriver@test.com',
            password: 'hash',
            role: 'driver'
        });
        await otherDriver.save();

        await expect(journeyService.boardPassenger(journey._id, '4589', {
            driverId: otherDriver._id
        })).rejects.toThrow(/Unauthorized: Driver is not assigned to this trip/i);
    });

    test('7. Wrong journey: throws journey not found error for invalid/unknown id', async () => {
        const { driver } = await createTestFixtures();
        const unknownJourneyId = new mongoose.Types.ObjectId();

        await expect(journeyService.boardPassenger(unknownJourneyId, '4589', {
            driverId: driver._id
        })).rejects.toThrow(/PassengerJourney not found/i);
    });

    test('8. Already boarded journey: cannot board again', async () => {
        const { driver, journey } = await createTestFixtures({
            journeyStatus: 'BOARDED',
            otpConsumed: true
        });

        await expect(journeyService.boardPassenger(journey._id, '4589', {
            driverId: driver._id
        })).rejects.toThrow(/Passenger is already boarded/i);
    });

    test('9. Cancelled journey: throws cannot board cancelled journey error', async () => {
        const { driver, journey } = await createTestFixtures({
            journeyStatus: 'CANCELLED_BY_CLIENT'
        });

        await expect(journeyService.boardPassenger(journey._id, '4589', {
            driverId: driver._id
        })).rejects.toThrow(/Cannot board: Journey has been CANCELLED/i);
    });

    test('10. Direct BOARDED PATCH bypass: updateTripStatus rejects direct transition to BOARDED', async () => {
        const { driver, trip } = await createTestFixtures();

        const req = {
            params: { id: trip._id.toString() },
            body: { status: 'BOARDED' },
            user: { id: driver._id.toString() }
        };

        let statusCode = null;
        let responseBody = null;
        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (data) => {
                responseBody = data;
                return res;
            }
        };

        await driverDispatchController.updateTripStatus(req, res);

        expect(statusCode).toBe(400);
        expect(responseBody.success).toBe(false);
        expect(responseBody.error).toMatch(/Direct status transition to BOARDED is prohibited/i);

        const checkTrip = await TripInstance.findById(trip._id);
        expect(checkTrip.status).toBe('ARRIVED'); // Untouched
    });

    test('11. Direct STARTED PATCH bypass: updateTripStatus rejects direct transition to STARTED', async () => {
        const { driver, trip } = await createTestFixtures();

        const req = {
            params: { id: trip._id.toString() },
            body: { status: 'STARTED' },
            user: { id: driver._id.toString() }
        };

        let statusCode = null;
        let responseBody = null;
        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            json: (data) => {
                responseBody = data;
                return res;
            }
        };

        await driverDispatchController.updateTripStatus(req, res);

        expect(statusCode).toBe(400);
        expect(responseBody.success).toBe(false);
        expect(responseBody.error).toMatch(/Direct status transition to STARTED is prohibited/i);

        const checkTrip = await TripInstance.findById(trip._id);
        expect(checkTrip.status).toBe('ARRIVED'); // Untouched
    });

    test('12. Canonical Controller Endpoint: POST /v2/dispatch/driver/trip/:id/board succeeds with valid OTP and fails with invalid OTP', async () => {
        const { driver, trip, journey } = await createTestFixtures();

        // 12a: Invalid OTP via controller
        const failReq = {
            params: { id: trip._id.toString() },
            body: { otp: '0000', journeyId: journey._id.toString() },
            user: { id: driver._id.toString() }
        };
        let failCode = null;
        let failBody = null;
        const failRes = {
            status: (code) => { failCode = code; return failRes; },
            json: (data) => { failBody = data; return failRes; }
        };

        await driverDispatchController.boardPassenger(failReq, failRes);
        expect(failCode).toBe(400);
        expect(failBody.success).toBe(false);
        expect(failBody.error).toMatch(/Invalid verification OTP code/i);

        // 12b: Valid OTP via controller
        const successReq = {
            params: { id: trip._id.toString() },
            body: { otp: '4589', journeyId: journey._id.toString() },
            user: { id: driver._id.toString() }
        };
        let successCode = null;
        let successBody = null;
        const successRes = {
            status: (code) => { successCode = code; return successRes; },
            json: (data) => { successBody = data; return successRes; }
        };

        await driverDispatchController.boardPassenger(successReq, successRes);
        expect(successCode).toBe(200);
        expect(successBody.success).toBe(true);
        expect(successBody.data.status).toBe('BOARDED');

        const updatedTrip = await TripInstance.findById(trip._id);
        expect(updatedTrip.status).toBe('BOARDED');
    });
});
