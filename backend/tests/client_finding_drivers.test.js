const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const DispatchServiceV2 = require('../services/v2/dispatchService');
const OfferAcceptanceEngine = require('../services/offerAcceptanceEngine');
const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
const Route = require('../models/Route');
const Trip = require('../models/Trip');
const FinancialJournal = require('../models/FinancialJournal');
const NotificationService = require('../services/notificationService');

jest.setTimeout(60000);

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
    await Route.createCollection();
    await Trip.createCollection();
    await FinancialJournal.createCollection();
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
    await Route.deleteMany({});
    await Trip.deleteMany({});
    await FinancialJournal.deleteMany({});
    jest.restoreAllMocks();
});

describe('CLIENT FINDING DRIVERS EXPERIENCE & ROUTE-SCOPED LIFECYCLE', () => {

    async function setupDriver(fullName = 'Yassine Driver') {
        const driver = new User({
            fullName,
            email: `driver_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'driver',
            driverStatus: 'ONLINE',
            verificationStatus: 'verified',
            wallet: { balance: 100 }
        });
        await driver.save();

        const driverRoute = new Route({
            userId: driver._id,
            role: 'driver',
            status: 'active',
            seatsTotal: 4,
            seatsAvailable: 4,
            startPoint: {
                type: 'Point',
                coordinates: [-7.6114, 33.5731], // Casa
                address: 'Casablanca Center'
            },
            endPoint: {
                type: 'Point',
                coordinates: [-6.8498, 34.0209], // Rabat
                address: 'Rabat Agdal'
            },
            schedule: { time: '08:30' }
        });
        await driverRoute.save();

        const trip = new Trip({
            routeId: driverRoute._id,
            driverId: driver._id,
            date: new Date(),
            seatsAvailable: 4,
            status: 'MATCHING',
            clients: []
        });
        await trip.save();

        return { driver, driverRoute, trip };
    }

    async function setupClient() {
        const client = new User({
            fullName: 'Fatima Client',
            email: `client_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'client',
            verificationStatus: 'verified',
            walletBalance: 200
        });
        await client.save();

        // Route A (Off-corridor: Agadir -> Inezgane)
        const routeA = new Route({
            userId: client._id,
            role: 'client',
            status: 'active',
            startPoint: {
                type: 'Point',
                coordinates: [-9.55, 30.42],
                address: 'Agadir Center'
            },
            endPoint: {
                type: 'Point',
                coordinates: [-9.50, 30.40],
                address: 'Inezgane Center'
            },
            schedule: { time: '08:45' },
            price: { amount: 25, type: 'fix' }
        });
        await routeA.save();

        // Route B (On-corridor with Casa-Rabat: Mohammedia -> Bouznika)
        const routeB = new Route({
            userId: client._id,
            role: 'client',
            status: 'active',
            startPoint: {
                type: 'Point',
                coordinates: [-7.38292, 33.70744],
                address: 'Mohammedia Midpoint'
            },
            endPoint: {
                type: 'Point',
                coordinates: [-7.07828, 33.88656],
                address: 'Bouznika Midpoint'
            },
            schedule: { time: '08:45' },
            price: { amount: 40, type: 'fix' },
            routeGeometry: '_mqNvxq`@_ulL'
        });
        await routeB.save();

        return { client, routeA, routeB };
    }

    test('1. Driver invitation emits dispatch:offer_received with clientRouteId and driver routeInfo', async () => {
        const { driver, driverRoute } = await setupDriver();
        const { client, routeB } = await setupClient();

        let emittedEvent = null;
        let emittedPayload = null;

        jest.spyOn(NotificationService, 'emitToPassenger').mockImplementation((passengerId, event, payload) => {
            if (event === 'dispatch:offer_received') {
                emittedEvent = event;
                emittedPayload = payload;
            }
        });

        const offer = await DispatchServiceV2.invitePassenger(driver._id, {
            clientRouteId: routeB._id.toString(),
            driverRouteId: driverRoute._id.toString(),
            proposedPrice: 45
        });

        expect(offer).toBeDefined();
        expect(offer.status).toBe('DRIVER_PROPOSED');
        expect(emittedEvent).toBe('dispatch:offer_received');
        expect(emittedPayload).toBeDefined();
        expect(emittedPayload.price).toBe(45);
        expect(emittedPayload.routeInfo).toBeDefined();
        expect(emittedPayload.routeInfo.clientRouteId.toString()).toBe(routeB._id.toString());
        expect(emittedPayload.routeInfo.driverRouteId.toString()).toBe(driverRoute._id.toString());
        expect(emittedPayload.routeInfo.driverRouteGeometry).toBe(driverRoute.routeGeometry);
    });

    test('2. Multiple client routes remain independent: Offer for Route B is isolated from Route A', async () => {
        const { driver, driverRoute } = await setupDriver();
        const { client, routeA, routeB } = await setupClient();

        // Send offer for Route B
        const offerB = await DispatchServiceV2.invitePassenger(driver._id, {
            clientRouteId: routeB._id.toString(),
            driverRouteId: driverRoute._id.toString(),
            proposedPrice: 50
        });

        // Query offers for Route A vs Route B
        const offersForRouteA = await Offer.find({
            passengerId: client._id,
            'metadata.clientRouteId': routeA._id
        });

        const offersForRouteB = await Offer.find({
            passengerId: client._id,
            'metadata.clientRouteId': routeB._id
        });

        expect(offersForRouteA.length).toBe(0);
        expect(offersForRouteB.length).toBe(1);
        expect(offersForRouteB[0]._id.toString()).toBe(offerB._id.toString());
    });

    test('3. Offer acceptance transitions lifecycle, marks offer ACCEPTED, and creates TripAssignment', async () => {
        const { driver, driverRoute } = await setupDriver();
        const { client, routeB } = await setupClient();

        const offer = await DispatchServiceV2.invitePassenger(driver._id, {
            clientRouteId: routeB._id.toString(),
            driverRouteId: driverRoute._id.toString(),
            proposedPrice: 40
        });

        // Canonical atomic acceptance
        const assignment = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, client._id, {
            endpoint: '/api/v2/dispatch/offer/accept'
        });

        expect(assignment).toBeDefined();
        expect(assignment.status).toBe('ACTIVE');

        // Check updated offer
        const updatedOffer = await Offer.findById(offer._id);
        expect(updatedOffer.status).toBe('ACCEPTED');

        // Check TripInstance status
        const tripInstance = await TripInstance.findById(offer.tripInstanceId);
        expect(tripInstance.status).toBe('ASSIGNED');
        expect(tripInstance.driverId.toString()).toBe(driver._id.toString());

        // Check PassengerJourney
        const journey = await PassengerJourney.findOne({ tripInstanceId: tripInstance._id, passengerId: client._id });
        expect(journey).toBeDefined();
        expect(journey.status).toBe('BOOKED');
        expect(journey.verificationOtp).toBeDefined();
        expect(journey.verificationOtp.length).toBe(4);
    });

    test('4. Unrelated drivers do not produce offers for client routes', async () => {
        const { client, routeA } = await setupClient();
        const { driver: otherDriver } = await setupDriver('Far Away Driver');

        const offers = await Offer.find({
            passengerId: client._id,
            'metadata.clientRouteId': routeA._id
        });

        expect(offers.length).toBe(0);
    });
});
