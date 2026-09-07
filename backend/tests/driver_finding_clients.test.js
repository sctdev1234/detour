const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const tripService = require('../services/tripService');
const DispatchServiceV2 = require('../services/v2/dispatchService');
const OfferAcceptanceEngine = require('../services/offerAcceptanceEngine');
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

describe('DRIVER FINDING CLIENTS — LIFECYCLE & MULTI-ROUTE INTEGRATION', () => {

    async function createDriver(fullName = 'Karim Driver') {
        const driver = new User({
            fullName,
            email: `driver_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'driver',
            driverStatus: 'ONLINE',
            verificationStatus: 'verified',
            walletBalance: 150
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
            walletBalance: 200
        });
        await passenger.save();

        const pRoute = new Route({
            userId: passenger._id,
            role: 'client',
            status: 'active',
            startPoint: {
                type: 'Point',
                coordinates: pickupCoords,
                address: `${fullName} Pickup`
            },
            endPoint: {
                type: 'Point',
                coordinates: dropoffCoords,
                address: `${fullName} Destination`
            },
            departureTime: scheduleTime,
            price: 25
        });
        await pRoute.save();

        return { passenger, pRoute };
    }

    async function createDriverRoute(driver, startCoords, endCoords, scheduleTime = '08:30') {
        const dRoute = new Route({
            userId: driver._id,
            role: 'driver',
            status: 'active',
            startPoint: {
                type: 'Point',
                coordinates: startCoords,
                address: 'Driver Route Start'
            },
            endPoint: {
                type: 'Point',
                coordinates: endCoords,
                address: 'Driver Route End'
            },
            departureTime: scheduleTime,
            availableSeats: 4,
            price: 25
        });
        await dRoute.save();
        return dRoute;
    }

    test('1 & 2. Driver creates route entering FINDING_CLIENTS → multiple matching clients appear with corridor relationships', async () => {
        const driver = await createDriver('Driver A');
        const driverRoute = await createDriverRoute(driver, [-7.6200, 33.5800], [-7.5300, 33.5900]);

        // Create 2 matching passengers along route corridor
        const p1 = await createPassenger('Fatima', [-7.6100, 33.5820], [-7.5400, 33.5880]);
        const p2 = await createPassenger('Omar', [-7.6000, 33.5830], [-7.5500, 33.5870]);

        // Search matches for driverRoute with driver role & id
        const matches = await tripService.searchMatches(driverRoute._id, 'driver', driver._id);

        expect(matches).toBeDefined();
        expect(Array.isArray(matches)).toBe(true);
        expect(matches.length).toBeGreaterThanOrEqual(2);

        // Every client displayed must have correct relationship data
        matches.forEach(m => {
            expect(m.pickup).toBeDefined();
            expect(m.destination).toBeDefined();
            expect(m.match).toBeDefined();
            expect(m.match.verified).toBe(true);
            expect(m.match.pickupDistanceMeters).toBeDefined();
            expect(m.match.dropoffDistanceMeters).toBeDefined();
            expect(m.fare).toBeDefined();
        });
    });

    test('3 & 4. Driver route isolation: switching route changes matched clients context and isolates Route A from Route B', async () => {
        const driver = await createDriver('Driver Multi');
        const routeA = await createDriverRoute(driver, [-7.6200, 33.5800], [-7.5300, 33.5900], '08:30');
        const routeB = await createDriverRoute(driver, [-7.9900, 31.6300], [-8.0500, 31.6600], '14:00'); // Marrakech

        // Passenger 1 near Route A (Casablanca)
        const p1 = await createPassenger('Casablanca Passenger', [-7.6100, 33.5820], [-7.5400, 33.5880], '08:45');
        // Passenger 2 near Route B (Marrakech)
        const p2 = await createPassenger('Marrakech Passenger', [-7.9950, 31.6350], [-8.0450, 31.6550], '14:15');

        const matchesA = await tripService.searchMatches(routeA._id, 'driver', driver._id);
        const matchesB = await tripService.searchMatches(routeB._id, 'driver', driver._id);

        const matchAIds = matchesA.map(m => m.requestId || (m.route && m.route._id ? m.route._id.toString() : ''));
        const matchBIds = matchesB.map(m => m.requestId || (m.route && m.route._id ? m.route._id.toString() : ''));

        expect(matchAIds).toContain(p1.pRoute._id.toString());
        expect(matchAIds).not.toContain(p2.pRoute._id.toString());

        expect(matchBIds).toContain(p2.pRoute._id.toString());
        expect(matchBIds).not.toContain(p1.pRoute._id.toString());
    });

    test('6. Driver sends canonical invitation → creates DRIVER_PROPOSED Offer (No legacy JoinRequest)', async () => {
        const driver = await createDriver('Driver Proposer');
        const driverRoute = await createDriverRoute(driver, [-7.6200, 33.5800], [-7.5300, 33.5900]);
        const p1 = await createPassenger('Amina', [-7.6100, 33.5820], [-7.5400, 33.5880]);

        await tripService.searchMatches(driverRoute._id, 'driver', driver._id);

        const offer = await DispatchServiceV2.invitePassenger(driver._id, {
            driverRouteId: driverRoute._id,
            clientRouteId: p1.pRoute._id,
            proposedPrice: 30
        });

        expect(offer).toBeDefined();
        expect(offer.status).toBe('DRIVER_PROPOSED');
        expect(offer.driverId.toString()).toBe(driver._id.toString());
        expect(offer.passengerId.toString()).toBe(p1.passenger._id.toString());
        expect(offer.price).toBe(30);
    });

    test('7 & 8. Client accepts canonical offer → TripAssignment + PassengerJourney created, passenger assigned to route', async () => {
        const driver = await createDriver('Driver Acceptor');
        const driverRoute = await createDriverRoute(driver, [-7.6200, 33.5800], [-7.5300, 33.5900]);
        const p1 = await createPassenger('Hassan', [-7.6100, 33.5820], [-7.5400, 33.5880]);

        await tripService.searchMatches(driverRoute._id, 'driver', driver._id);

        const offer = await DispatchServiceV2.invitePassenger(driver._id, {
            driverRouteId: driverRoute._id,
            clientRouteId: p1.pRoute._id,
            proposedPrice: 28
        });

        // Client accepts canonical offer via OfferAcceptanceEngine
        const assignment = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, p1.passenger._id);

        expect(assignment).toBeDefined();
        expect(assignment.status).toBe('ACTIVE');
        expect(assignment.driverId.toString()).toBe(driver._id.toString());
        expect(assignment.tripInstanceId).toBeDefined();

        // Verify PassengerJourney created in BOOKED state with OTP
        const journey = await PassengerJourney.findOne({ passengerId: p1.passenger._id });
        expect(journey).toBeDefined();
        expect(journey.status).toBe('BOOKED');
        expect(journey.passengerId.toString()).toBe(p1.passenger._id.toString());
        expect(journey.tripInstanceId.toString()).toBe(assignment.tripInstanceId.toString());
        expect(journey.verificationOtp).toBeDefined();

        // Verify offer marked ACCEPTED
        const updatedOffer = await Offer.findById(offer._id);
        expect(updatedOffer.status).toBe('ACCEPTED');
    });

    test('9. Rejected/expired clients do NOT appear in assigned passengers list', async () => {
        const driver = await createDriver('Driver Rejection');
        const driverRoute = await createDriverRoute(driver, [-7.6200, 33.5800], [-7.5300, 33.5900]);
        const p1 = await createPassenger('Zineb', [-7.6100, 33.5820], [-7.5400, 33.5880]);
        const p2 = await createPassenger('Mehdi', [-7.6000, 33.5830], [-7.5500, 33.5870]);

        await tripService.searchMatches(driverRoute._id, 'driver', driver._id);

        // Invite p1
        const offer1 = await DispatchServiceV2.invitePassenger(driver._id, {
            driverRouteId: driverRoute._id,
            clientRouteId: p1.pRoute._id,
            proposedPrice: 25
        });

        // p1 rejects offer
        offer1.status = 'REJECTED';
        await offer1.save();

        // Invite p2
        const offer2 = await DispatchServiceV2.invitePassenger(driver._id, {
            driverRouteId: driverRoute._id,
            clientRouteId: p2.pRoute._id,
            proposedPrice: 25
        });
        // p2 offer expires
        offer2.status = 'EXPIRED';
        await offer2.save();

        // Query assigned passengers for driver
        const assignments = await TripAssignment.find({
            driverId: driver._id,
            status: { $in: ['ACTIVE', 'BOOKED', 'BOARDED', 'IN_TRANSIT'] }
        });

        expect(assignments.length).toBe(0);
    });

    test('10. Multiple driver routes remain completely isolated during lifecycle transitions', async () => {
        const driver = await createDriver('Driver Isolation');
        const route1 = await createDriverRoute(driver, [-7.6200, 33.5800], [-7.5300, 33.5900], '08:00');
        const route2 = await createDriverRoute(driver, [-7.6500, 33.5700], [-7.5200, 33.6000], '18:00');

        const p1 = await createPassenger('Pass 1', [-7.6100, 33.5820], [-7.5400, 33.5880]);

        await tripService.searchMatches(route1._id, 'driver', driver._id);
        await tripService.searchMatches(route2._id, 'driver', driver._id);

        // Invite passenger only on Route 1
        const offer = await DispatchServiceV2.invitePassenger(driver._id, {
            driverRouteId: route1._id,
            clientRouteId: p1.pRoute._id,
            proposedPrice: 30
        });

        const assignment = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, p1.passenger._id);
        expect(assignment).toBeDefined();

        // Assignment metadata links to Route 1
        const offerDoc = await Offer.findById(offer._id);
        const linkedRouteId = offerDoc.metadata.get ? offerDoc.metadata.get('driverRouteId') : offerDoc.metadata.driverRouteId;
        expect(linkedRouteId.toString()).toBe(route1._id.toString());
        expect(linkedRouteId.toString()).not.toBe(route2._id.toString());

        // Route 2 has zero offers and zero assignments
        const route2Offers = await Offer.find({ 'metadata.driverRouteId': route2._id });
        expect(route2Offers.length).toBe(0);
    });
});
