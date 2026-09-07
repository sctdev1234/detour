const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const tripService = require('../services/tripService');
const Trip = require('../models/Trip');
const Route = require('../models/Route');
const JoinRequest = require('../models/JoinRequest');
const TripInstance = require('../models/TripInstance');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const Offer = require('../models/Offer');
const User = require('../models/User');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const OutboxEvent = require('../models/OutboxEvent');

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    await Trip.createCollection();
    await Route.createCollection();
    await JoinRequest.createCollection();
    await TripInstance.createCollection();
    await TripAssignment.createCollection();
    await PassengerJourney.createCollection();
    await Offer.createCollection();
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
    await Trip.deleteMany({});
    await Route.deleteMany({});
    await JoinRequest.deleteMany({});
    await TripInstance.deleteMany({});
    await TripAssignment.deleteMany({});
    await PassengerJourney.deleteMany({});
    await Offer.deleteMany({});
    await User.deleteMany({});
    await FinancialJournal.deleteMany({});
    await FinancialLedgerEntry.deleteMany({});
    await OutboxEvent.deleteMany({});
});

describe('Phase 7: Legacy V1 Lifecycle Isolation', () => {

    async function createLegacyFixtures() {
        const driver = new User({
            fullName: 'Legacy Driver',
            email: `driver_${Date.now()}_${Math.random()}@test.com`,
            phone: `+212600${Math.floor(100000 + Math.random() * 900000)}`,
            role: 'driver',
            driverStatus: 'ONLINE',
            walletBalance: 200,
            heldBalance: 0
        });
        await driver.save();

        const passenger = new User({
            fullName: 'Legacy Passenger',
            email: `passenger_${Date.now()}_${Math.random()}@test.com`,
            phone: `+212700${Math.floor(100000 + Math.random() * 900000)}`,
            role: 'client',
            walletBalance: 150,
            heldBalance: 0
        });
        await passenger.save();

        const driverRoute = new Route({
            userId: driver._id,
            role: 'driver',
            startPoint: { type: 'Point', coordinates: [-7.5898, 33.5731], address: 'Casablanca' },
            endPoint: { type: 'Point', coordinates: [-6.8498, 34.0208], address: 'Rabat' },
            price: { amount: 50, currency: 'MAD' },
            distanceKm: 85,
            estimatedDurationMin: 60,
            status: 'active'
        });
        await driverRoute.save();

        const clientRoute = new Route({
            userId: passenger._id,
            role: 'client',
            startPoint: { type: 'Point', coordinates: [-7.5898, 33.5731], address: 'Casablanca' },
            endPoint: { type: 'Point', coordinates: [-6.8498, 34.0208], address: 'Rabat' },
            price: { amount: 50, currency: 'MAD' },
            distanceKm: 85,
            estimatedDurationMin: 60,
            status: 'pending'
        });
        await clientRoute.save();

        const legacyTrip = new Trip({
            routeId: driverRoute._id,
            driverId: driver._id,
            clients: [],
            status: 'CREATED'
        });
        await legacyTrip.save();

        return { driver, passenger, driverRoute, clientRoute, legacyTrip };
    }

    test('1. Accepting a JoinRequest with an active canonical Offer routes through OfferAcceptanceEngine', async () => {
        const { driver, passenger, driverRoute, clientRoute, legacyTrip } = await createLegacyFixtures();

        // Create canonical TripInstance for passenger
        const tripInstance = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            driverId: driver._id,
            passengerIds: [passenger._id],
            status: 'OFFERS_OPEN',
            capacity: 4,
            scheduledTime: new Date(),
            pickup: { type: 'Point', coordinates: [-7.5898, 33.5731], address: 'Casablanca' },
            destination: { type: 'Point', coordinates: [-6.8498, 34.0208], address: 'Rabat' }
        });
        await tripInstance.save();

        // Create canonical DRIVER_PROPOSED Offer
        const offer = new Offer({
            tripInstanceId: tripInstance._id,
            driverId: driver._id,
            passengerId: passenger._id,
            price: 50,
            status: 'DRIVER_PROPOSED',
            expiresAt: new Date(Date.now() + 120000)
        });
        await offer.save();

        // Create legacy JoinRequest
        const joinRequest = new JoinRequest({
            clientId: passenger._id,
            clientRouteId: clientRoute._id,
            tripId: legacyTrip._id,
            status: 'pending',
            initiatedBy: 'driver',
            proposedPrice: 50
        });
        await joinRequest.save();

        // Passenger accepts the join request
        const handled = await tripService.handleJoinRequest(passenger._id.toString(), {
            requestId: joinRequest._id.toString(),
            status: 'accepted'
        });

        expect(handled.status).toBe('accepted');

        // Verify canonical artifacts created
        const assignment = await TripAssignment.findOne({ tripInstanceId: tripInstance._id });
        expect(assignment).toBeDefined();
        expect(assignment.status).toBe('ACTIVE');

        const journey = await PassengerJourney.findOne({ tripInstanceId: tripInstance._id });
        expect(journey).toBeDefined();
        expect(journey.status).toBe('BOOKED');
        expect(journey.verificationOtp).toBeDefined();

        // Verify escrow held
        const updatedPassenger = await User.findById(passenger._id);
        expect(updatedPassenger.heldBalance).toBe(50);
        expect(updatedPassenger.walletBalance).toBe(100);

        // Verify TripInstance status is ASSIGNED
        const updatedInstance = await TripInstance.findById(tripInstance._id);
        expect(updatedInstance.status).toBe('ASSIGNED');

        // Verify legacy Trip read-only mirror is synced
        const updatedLegacyTrip = await Trip.findById(legacyTrip._id);
        expect(updatedLegacyTrip.clients.length).toBe(1);
    });

    test('2. Accepting a JoinRequest without canonical Offer or searching TripInstance is rejected', async () => {
        const { driver, passenger, clientRoute, legacyTrip } = await createLegacyFixtures();

        // Legacy JoinRequest with NO canonical TripInstance or Offer
        const joinRequest = new JoinRequest({
            clientId: passenger._id,
            clientRouteId: clientRoute._id,
            tripId: legacyTrip._id,
            status: 'pending',
            initiatedBy: 'driver',
            proposedPrice: 50
        });
        await joinRequest.save();

        // Accepting must throw deprecation error to prevent parallel unescrowed booking
        await expect(
            tripService.handleJoinRequest(passenger._id.toString(), {
                requestId: joinRequest._id.toString(),
                status: 'accepted'
            })
        ).rejects.toThrow(/Direct booking via legacy JoinRequest is deprecated/);

        // Verify no parallel booking occurred on legacy trip
        const checkTrip = await Trip.findById(legacyTrip._id);
        expect(checkTrip.clients.length).toBe(0);

        // Verify no assignments created
        const assignmentCount = await TripAssignment.countDocuments();
        expect(assignmentCount).toBe(0);
    });

    test('3. Rejecting a JoinRequest marks canonical Offer as REJECTED', async () => {
        const { driver, passenger, clientRoute, legacyTrip } = await createLegacyFixtures();

        const tripInstance = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            driverId: driver._id,
            passengerIds: [passenger._id],
            status: 'OFFERS_OPEN',
            capacity: 4,
            scheduledTime: new Date(),
            pickup: { type: 'Point', coordinates: [-7.5898, 33.5731], address: 'Casablanca' },
            destination: { type: 'Point', coordinates: [-6.8498, 34.0208], address: 'Rabat' }
        });
        await tripInstance.save();

        const offer = new Offer({
            tripInstanceId: tripInstance._id,
            driverId: driver._id,
            passengerId: passenger._id,
            price: 50,
            status: 'DRIVER_PROPOSED',
            expiresAt: new Date(Date.now() + 120000)
        });
        await offer.save();

        const joinRequest = new JoinRequest({
            clientId: passenger._id,
            clientRouteId: clientRoute._id,
            tripId: legacyTrip._id,
            status: 'pending',
            initiatedBy: 'driver',
            proposedPrice: 50
        });
        await joinRequest.save();

        // Passenger rejects request
        const handled = await tripService.handleJoinRequest(passenger._id.toString(), {
            requestId: joinRequest._id.toString(),
            status: 'rejected'
        });

        expect(handled.status).toBe('rejected');

        const updatedOffer = await Offer.findById(offer._id);
        expect(updatedOffer.status).toBe('REJECTED');
    });

    test('4. Legacy completeTrip, confirmPickup, confirmDropoff forbid operating on TripInstance directly', async () => {
        const { driver } = await createLegacyFixtures();

        const instance = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            driverId: driver._id,
            status: 'STARTED',
            capacity: 4,
            scheduledTime: new Date(),
            pickup: { type: 'Point', coordinates: [-7.5898, 33.5731], address: 'Casablanca' },
            destination: { type: 'Point', coordinates: [-6.8498, 34.0208], address: 'Rabat' }
        });
        await instance.save();

        // Attempt 1: completeTrip on TripInstance
        await expect(
            tripService.completeTrip(driver._id.toString(), instance._id.toString())
        ).rejects.toThrow(/Direct completion of TripInstance is forbidden/);

        // Attempt 2: confirmPickup on TripInstance
        await expect(
            tripService.confirmPickup(driver._id.toString(), {
                tripId: instance._id.toString(),
                clientId: new mongoose.Types.ObjectId().toString()
            })
        ).rejects.toThrow(/Direct pickup on TripInstance is prohibited/);

        // Attempt 3: confirmDropoff on TripInstance
        await expect(
            tripService.confirmDropoff(driver._id.toString(), {
                tripId: instance._id.toString(),
                clientId: new mongoose.Types.ObjectId().toString()
            })
        ).rejects.toThrow(/Direct dropoff on TripInstance is prohibited/);
    });
});
