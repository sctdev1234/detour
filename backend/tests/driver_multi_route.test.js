const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const tripService = require('../services/tripService');
const DispatchServiceV2 = require('../services/v2/dispatchService');
const User = require('../models/User');
const Route = require('../models/Route');
const Trip = require('../models/Trip');
const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const FinancialJournal = require('../models/FinancialJournal');

jest.setTimeout(60000);

let mongoServer;

beforeAll(async () => {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await User.createCollection();
    await Route.createCollection();
    await Trip.createCollection();
    await TripInstance.createCollection();
    await Offer.createCollection();
    await TripAssignment.createCollection();
    await PassengerJourney.createCollection();
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
    await User.deleteMany({});
    await Route.deleteMany({});
    await Trip.deleteMany({});
    await TripInstance.deleteMany({});
    await Offer.deleteMany({});
    await TripAssignment.deleteMany({});
    await PassengerJourney.deleteMany({});
    await FinancialJournal.deleteMany({});
    jest.restoreAllMocks();
});

describe('DRIVER MULTI-ROUTE ARCHITECTURE & CONTEXTUAL LIFECYCLE', () => {

    async function createDriver(fullName = 'Yassine Driver') {
        const driver = new User({
            fullName,
            email: `driver_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'driver',
            driverStatus: 'ONLINE',
            verificationStatus: 'verified',
            walletBalance: 100
        });
        await driver.save();
        return driver;
    }

    async function createPassenger(fullName, pickupCoords, dropoffCoords, scheduleTime = '08:45') {
        const passenger = new User({
            fullName,
            email: `passenger_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'client',
            verificationStatus: 'verified',
            walletBalance: 150
        });
        await passenger.save();

        const route = new Route({
            userId: passenger._id,
            role: 'client',
            status: 'active',
            seats: 1,
            startPoint: { type: 'Point', coordinates: pickupCoords, address: `${fullName} Pickup` },
            endPoint: { type: 'Point', coordinates: dropoffCoords, address: `${fullName} Dropoff` },
            schedule: { time: scheduleTime },
            price: { amount: 25, type: 'fix' }
        });
        await route.save();
        return { passenger, route };
    }

    test('1. Zero routes: Driver initially has 0 routes, then creates first route', async () => {
        const driver = await createDriver();

        // Check initial zero routes
        const initialRoutes = await tripService.getRoutes(driver._id);
        expect(initialRoutes).toBeDefined();
        expect(initialRoutes.length).toBe(0);

        // Driver creates first route (Casablanca -> Rabat)
        const firstRoute = await tripService.createRoute(driver._id, {
            role: 'driver',
            startPoint: { latitude: 33.5731, longitude: -7.6114, address: 'Casablanca Center' },
            endPoint: { latitude: 34.0209, longitude: -6.8498, address: 'Rabat Agdal' },
            waypoints: [],
            timeStart: '08:30',
            timeArrival: '09:30',
            days: ['Mon', 'Tue', 'Wed'],
            seatsTotal: 4
        });

        expect(firstRoute).toBeDefined();
        expect(firstRoute.role).toBe('driver');
        expect(firstRoute.userId.toString()).toBe(driver._id.toString());

        // Verify route is retrieved
        const routesAfter = await tripService.getRoutes(driver._id);
        expect(routesAfter.length).toBe(1);
        expect(routesAfter[0]._id.toString()).toBe(firstRoute._id.toString());
    });

    test('2. Multiple routes: Existing routes do not block creating Route B and Route C', async () => {
        const driver = await createDriver();

        // Route A: Casablanca -> Rabat
        const routeA = await tripService.createRoute(driver._id, {
            role: 'driver',
            startPoint: { latitude: 33.5731, longitude: -7.6114, address: 'Casablanca Port' },
            endPoint: { latitude: 34.0209, longitude: -6.8498, address: 'Rabat Ville' },
            waypoints: [],
            timeStart: '08:00',
            days: ['Mon', 'Wed', 'Fri'],
            seatsTotal: 4
        });

        // Route B: Casablanca -> Mohammedia
        const routeB = await tripService.createRoute(driver._id, {
            role: 'driver',
            startPoint: { latitude: 33.5731, longitude: -7.6114, address: 'Casablanca Oasis' },
            endPoint: { latitude: 33.7074, longitude: -7.3829, address: 'Mohammedia Gare' },
            waypoints: [],
            timeStart: '10:30',
            days: ['Tue', 'Thu'],
            seatsTotal: 3
        });

        // Route C: Rabat -> Kenitra
        const routeC = await tripService.createRoute(driver._id, {
            role: 'driver',
            startPoint: { latitude: 34.0209, longitude: -6.8498, address: 'Rabat Agdal' },
            endPoint: { latitude: 34.2610, longitude: -6.5802, address: 'Kenitra Center' },
            waypoints: [],
            timeStart: '18:00',
            days: ['Fri', 'Sat'],
            seatsTotal: 4
        });

        // All 3 routes exist simultaneously
        const allRoutes = await tripService.getRoutes(driver._id);
        expect(allRoutes.length).toBe(3);

        const routeIds = allRoutes.map(r => r._id.toString());
        expect(routeIds).toContain(routeA._id.toString());
        expect(routeIds).toContain(routeB._id.toString());
        expect(routeIds).toContain(routeC._id.toString());
    });

    test('3. Map visibility: All driver routes are queryable with full coordinates & geometry simultaneously', async () => {
        const driver = await createDriver();

        await tripService.createRoute(driver._id, {
            role: 'driver',
            startPoint: { latitude: 33.57, longitude: -7.61, address: 'Point A1' },
            endPoint: { latitude: 34.02, longitude: -6.85, address: 'Point A2' },
            timeStart: '08:00'
        });

        await tripService.createRoute(driver._id, {
            role: 'driver',
            startPoint: { latitude: 33.60, longitude: -7.50, address: 'Point B1' },
            endPoint: { latitude: 33.90, longitude: -7.00, address: 'Point B2' },
            timeStart: '09:00'
        });

        const routes = await Route.find({ userId: driver._id, role: 'driver' });
        expect(routes.length).toBe(2);

        routes.forEach(r => {
            expect(r.startPoint.coordinates).toBeDefined();
            expect(r.startPoint.coordinates.length).toBe(2);
            expect(r.endPoint.coordinates).toBeDefined();
            expect(['pending', 'active']).toContain(r.status);
        });
    });

    test('4. Route selection & contextual isolation: Matches for Route A are strictly isolated from Route B', async () => {
        const driver = await createDriver();

        // Driver Route A: Casablanca -> Rabat (passes Mohammedia & Bouznika)
        const driverRouteA = await Route.create({
            userId: driver._id,
            role: 'driver',
            status: 'active',
            seatsTotal: 4,
            startPoint: { type: 'Point', coordinates: [-7.6114, 33.5731], address: 'Casablanca' },
            endPoint: { type: 'Point', coordinates: [-6.8498, 34.0209], address: 'Rabat' },
            schedule: { time: '08:30' }
        });

        // Driver Route B: Agadir -> Inezgane (far south corridor)
        const driverRouteB = await Route.create({
            userId: driver._id,
            role: 'driver',
            status: 'active',
            seatsTotal: 4,
            startPoint: { type: 'Point', coordinates: [-9.55, 30.42], address: 'Agadir' },
            endPoint: { type: 'Point', coordinates: [-9.50, 30.40], address: 'Inezgane' },
            schedule: { time: '08:30' }
        });

        // Passenger 1: on Casa -> Rabat corridor (Mohammedia -> Bouznika)
        const p1 = await createPassenger(
            'Passenger Casa-Rabat',
            [-7.38292, 33.70744],
            [-7.07828, 33.88656],
            '08:45'
        );

        // Passenger 2: on Agadir corridor
        const p2 = await createPassenger(
            'Passenger Agadir',
            [-9.54, 30.41],
            [-9.51, 30.40],
            '08:45'
        );

        // Search matches for Route A
        const matchesA = await tripService.searchMatches(driverRouteA._id, 'driver', driver._id);
        const matchRouteIdsA = matchesA.map(m => m.route._id.toString());

        expect(matchRouteIdsA).toContain(p1.route._id.toString());
        expect(matchRouteIdsA).not.toContain(p2.route._id.toString());

        // Search matches for Route B (contextual switch)
        const matchesB = await tripService.searchMatches(driverRouteB._id, 'driver', driver._id);
        const matchRouteIdsB = matchesB.map(m => m.route._id.toString());

        expect(matchRouteIdsB).toContain(p2.route._id.toString());
        expect(matchRouteIdsB).not.toContain(p1.route._id.toString());
    });

    test('5. Contextual state isolation: Sending an invitation on Route A does not affect Route B', async () => {
        const driver = await createDriver();

        const driverRouteA = await Route.create({
            userId: driver._id,
            role: 'driver',
            status: 'active',
            seatsTotal: 4,
            startPoint: { type: 'Point', coordinates: [-7.6114, 33.5731], address: 'Casablanca' },
            endPoint: { type: 'Point', coordinates: [-6.8498, 34.0209], address: 'Rabat' },
            schedule: { time: '08:30' }
        });

        const driverRouteB = await Route.create({
            userId: driver._id,
            role: 'driver',
            status: 'active',
            seatsTotal: 4,
            startPoint: { type: 'Point', coordinates: [-9.55, 30.42], address: 'Agadir' },
            endPoint: { type: 'Point', coordinates: [-9.50, 30.40], address: 'Inezgane' },
            schedule: { time: '08:30' }
        });

        const tripA = await Trip.create({
            routeId: driverRouteA._id,
            driverId: driver._id,
            date: new Date(),
            seatsAvailable: 4,
            status: 'MATCHING',
            clients: []
        });

        const { passenger, route: pRoute } = await createPassenger(
            'Passenger Mohammedia',
            [-7.38292, 33.70744],
            [-7.07828, 33.88656],
            '08:45'
        );

        // Send invitation for Route A
        const offerA = await DispatchServiceV2.invitePassenger(driver._id, {
            clientRouteId: pRoute._id.toString(),
            driverRouteId: driverRouteA._id.toString(),
            tripId: tripA._id.toString(),
            proposedPrice: 30
        });

        expect(offerA).toBeDefined();
        expect(offerA.status).toBe('DRIVER_PROPOSED');

        // Check offers associated with Route A vs Route B
        const offersForRouteA = await Offer.find({
            'metadata.driverRouteId': driverRouteA._id
        });
        const offersForRouteB = await Offer.find({
            'metadata.driverRouteId': driverRouteB._id
        });

        expect(offersForRouteA.length).toBe(1);
        expect(offersForRouteB.length).toBe(0);
    });
});
