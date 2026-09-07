const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const DispatchServiceV2 = require('../services/v2/dispatchService');
const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const OutboxEvent = require('../models/OutboxEvent');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await TripInstance.createCollection();
    await Offer.createCollection();
    await TripAssignment.createCollection();
    await PassengerJourney.createCollection();
    await User.createCollection();
    await FinancialJournal.createCollection();
    await FinancialLedgerEntry.createCollection();
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
    await Offer.deleteMany({});
    await TripAssignment.deleteMany({});
    await PassengerJourney.deleteMany({});
    await User.deleteMany({});
    await FinancialJournal.deleteMany({});
    await FinancialLedgerEntry.deleteMany({});
    await OutboxEvent.deleteMany({});
});

describe('Assignment, Boarding (OTP) & Settlement Lifecycle', () => {
    test('1. acceptOffer atomically creates Assignment, PassengerJourney with OTP, and holds Escrow', async () => {
        // Setup passenger with wallet balance
        const passenger = new User({
            fullName: 'Test Passenger',
            email: 'passenger@test.com',
            password: 'hash',
            role: 'client',
            walletBalance: 100,
            heldBalance: 0
        });
        await passenger.save();

        const driver = new User({
            fullName: 'Test Driver',
            email: 'driver@test.com',
            password: 'hash',
            role: 'driver',
            walletBalance: 200,
            driverStatus: 'ONLINE'
        });
        await driver.save();

        const instance = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            passengerIds: [passenger._id],
            pickup: { type: 'Point', coordinates: [-7.5898, 33.5731], address: 'Casablanca' },
            destination: { type: 'Point', coordinates: [-6.8498, 34.0208], address: 'Rabat' },
            scheduledTime: new Date(),
            status: 'OFFERS_OPEN'
        });
        await instance.save();

        const offer = new Offer({
            tripInstanceId: instance._id,
            driverId: driver._id,
            passengerId: passenger._id,
            price: 30,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 60000)
        });
        await offer.save();

        const competingOffer = new Offer({
            tripInstanceId: instance._id,
            driverId: new mongoose.Types.ObjectId(),
            passengerId: passenger._id,
            price: 35,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 60000)
        });
        await competingOffer.save();

        // Accept offer
        const assignment = await DispatchServiceV2.acceptOffer(offer._id, passenger._id);

        expect(assignment).toBeDefined();
        expect(assignment.driverId.toString()).toBe(driver._id.toString());

        // Verify TripInstance is ASSIGNED
        const updatedInstance = await TripInstance.findById(instance._id);
        expect(updatedInstance.status).toBe('ASSIGNED');
        expect(updatedInstance.assignmentId.toString()).toBe(assignment._id.toString());
        // Verify capacity reserved across segments
        expect(updatedInstance.segmentCapacity.length).toBeGreaterThan(0);
        expect(updatedInstance.segmentCapacity[0].seatsOccupied).toBe(1);

        // Verify PassengerJourney created with 4-digit OTP
        const journey = await PassengerJourney.findOne({ tripInstanceId: instance._id });
        expect(journey).toBeDefined();
        expect(journey.status).toBe('BOOKED');
        expect(journey.verificationOtp).toMatch(/^[0-9]{4}$/);
        expect(journey.fareAmountMad).toBe(30);

        // Verify Digital Escrow hold in Ledger & User balances
        const updatedPassenger = await User.findById(passenger._id);
        expect(updatedPassenger.walletBalance).toBe(70); // 100 - 30
        expect(updatedPassenger.heldBalance).toBe(30);

        const escrowJournal = await FinancialJournal.findOne({ referenceType: 'ESCROW_HOLD_DIGITAL' });
        expect(escrowJournal).toBeDefined();
        expect(escrowJournal.totalDebitCentimes).toBe(3000);
        expect(escrowJournal.totalCreditCentimes).toBe(3000);
        expect(escrowJournal.isBalanced).toBe(true);

        // Verify Competing offer rejected
        const updatedCompeting = await Offer.findById(competingOffer._id);
        expect(updatedCompeting.status).toBe('REJECTED');
    });

    test('2. acceptOffer fails when passenger wallet has insufficient balance', async () => {
        const poorPassenger = new User({
            fullName: 'Poor Passenger',
            email: 'poor@test.com',
            password: 'hash',
            role: 'client',
            walletBalance: 10,
            heldBalance: 0
        });
        await poorPassenger.save();

        const driver = new User({
            fullName: 'Driver Two',
            email: 'driver2@test.com',
            password: 'hash',
            role: 'driver',
            walletBalance: 100,
            driverStatus: 'ONLINE'
        });
        await driver.save();

        const instance = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            passengerIds: [poorPassenger._id],
            pickup: { type: 'Point', coordinates: [-7.5, 33.5], address: 'Casa' },
            destination: { type: 'Point', coordinates: [-6.8, 34.0], address: 'Rabat' },
            scheduledTime: new Date(),
            status: 'OFFERS_OPEN'
        });
        await instance.save();

        const offer = new Offer({
            tripInstanceId: instance._id,
            driverId: driver._id,
            passengerId: poorPassenger._id,
            price: 50,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 60000)
        });
        await offer.save();

        await expect(DispatchServiceV2.acceptOffer(offer._id, poorPassenger._id))
            .rejects.toThrow(/Insufficient wallet balance/);

        // Verify no assignment was made
        const count = await TripAssignment.countDocuments({ tripInstanceId: instance._id });
        expect(count).toBe(0);
    });

    test('3. Boarding fails without OTP, succeeds with correct 4-digit OTP', async () => {
        const journeyService = require('../services/journeyService');

        const journey = new PassengerJourney({
            tripInstanceId: new mongoose.Types.ObjectId(),
            passengerId: new mongoose.Types.ObjectId(),
            pickupWaypointIndex: 0,
            dropoffWaypointIndex: 1,
            seatsBooked: 1,
            paymentType: 'DIGITAL_ESCROW',
            fareAmountMad: 25,
            verificationOtp: '7412',
            status: 'BOOKED'
        });
        await journey.save();

        // Wrong OTP fails
        await expect(journeyService.boardPassenger(journey._id, '9999'))
            .rejects.toThrow('Invalid verification OTP code');

        // Correct OTP succeeds
        const boardedJourney = await journeyService.boardPassenger(journey._id, '7412');
        expect(boardedJourney.status).toBe('BOARDED');
        expect(boardedJourney.boardedAt).toBeDefined();
    });

    test('4. Dropoff executes balanced financial settlement and triggers TripCompletionEngine', async () => {
        const journeyService = require('../services/journeyService');

        const passenger = new User({
            fullName: 'Passenger Three',
            email: 'p3@test.com',
            password: 'hash',
            role: 'client',
            walletBalance: 0,
            heldBalance: 50
        });
        await passenger.save();

        const driver = new User({
            fullName: 'Driver Three',
            email: 'd3@test.com',
            password: 'hash',
            role: 'driver',
            walletBalance: 100,
            pendingEarnings: 0,
            driverStatus: 'BUSY'
        });
        await driver.save();

        const tripInstance = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            driverId: driver._id,
            passengerIds: [passenger._id],
            pickup: { type: 'Point', coordinates: [0, 0], address: 'Start' },
            destination: { type: 'Point', coordinates: [1, 1], address: 'End' },
            scheduledTime: new Date(),
            status: 'STARTED'
        });
        await tripInstance.save();

        const journey = new PassengerJourney({
            tripInstanceId: tripInstance._id,
            passengerId: passenger._id,
            pickupWaypointIndex: 0,
            dropoffWaypointIndex: 1,
            seatsBooked: 1,
            paymentType: 'DIGITAL_ESCROW',
            fareAmountMad: 50,
            verificationOtp: '1234',
            status: 'BOARDED'
        });
        await journey.save();

        // Dropoff passenger
        const result = await journeyService.dropoffPassenger(journey._id);

        expect(result.success).toBe(true);
        expect(result.journey.status).toBe('DROPPED_OFF');

        // Verify settlement journal
        const settlementJournal = await FinancialJournal.findOne({ referenceType: 'TRIP_SETTLEMENT' });
        expect(settlementJournal).toBeDefined();
        expect(settlementJournal.isBalanced).toBe(true);
        expect(settlementJournal.totalDebitCentimes).toBe(5000);

        // Verify driver pending earnings updated
        const updatedDriver = await User.findById(driver._id);
        expect(updatedDriver.pendingEarnings).toBeGreaterThan(0);
        // Driver status restored to ONLINE
        expect(updatedDriver.driverStatus).toBe('ONLINE');

        // Passenger held balance released
        const updatedPassenger = await User.findById(passenger._id);
        expect(updatedPassenger.heldBalance).toBe(0);

        // TripInstance automatically COMPLETED by TripCompletionEngine
        const completedTrip = await TripInstance.findById(tripInstance._id);
        expect(completedTrip.status).toBe('COMPLETED');
    });
});
