const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const DispatchServiceV2 = require('../services/v2/dispatchService');
const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
const Route = require('../models/Route');
const Trip = require('../models/Trip');
const FinancialJournal = require('../models/FinancialJournal');
const NotificationService = require('../services/notificationService');
const driverEligibilityService = require('../services/driverEligibilityService');

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

describe('DETOUR.MA — PHASE 2 CANONICAL DRIVER INVITATION TESTS', () => {

    // Helper to create online & eligible driver + corridor route (Casablanca -> Rabat)
    async function setupDriverAndRoute() {
        const driver = new User({
            fullName: 'Karim Driver',
            email: `driver_${Date.now()}@test.com`,
            password: 'hash',
            role: 'driver',
            driverStatus: 'ONLINE',
            verificationStatus: 'verified'
        });
        await driver.save();

        const driverRoute = new Route({
            userId: driver._id,
            role: 'driver',
            status: 'active',
            seatsTotal: 4,
            startPoint: { type: 'Point', coordinates: [-7.6114, 33.5731], address: 'Casablanca' },
            waypoints: [],
            endPoint: { type: 'Point', coordinates: [-6.8498, 34.0209], address: 'Rabat' },
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

    // Helper to create matched passenger route (Mohammedia -> Bouznika, strictly along corridor)
    async function setupMatchedPassenger() {
        const passenger = new User({
            fullName: 'Fatima Passenger',
            email: `passenger_${Date.now()}@test.com`,
            password: 'hash',
            role: 'client'
        });
        await passenger.save();

        const passengerRoute = new Route({
            userId: passenger._id,
            role: 'client',
            status: 'active',
            seats: 1,
            startPoint: { type: 'Point', coordinates: [-7.38292, 33.70744], address: 'Mohammedia Midpoint' },
            endPoint: { type: 'Point', coordinates: [-7.07828, 33.88656], address: 'Bouznika Midpoint' },
            schedule: { time: '08:45' },
            price: { amount: 20 }
        });
        await passengerRoute.save();

        return { passenger, passengerRoute };
    }

    test('1. Valid driver creates DRIVER_PROPOSED Offer', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();
        const { passenger, passengerRoute } = await setupMatchedPassenger();

        const emitSpy = jest.spyOn(NotificationService, 'emitToPassenger').mockImplementation(() => {});

        const offer = await DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString(),
            proposedPrice: 25
        });

        expect(offer).toBeDefined();
        expect(offer.status).toBe('DRIVER_PROPOSED');
        expect(offer.driverId.toString()).toBe(driver._id.toString());
        expect(offer.passengerId.toString()).toBe(passenger._id.toString());
        expect(offer.price).toBe(25);
        expect(offer.currency).toBe('MAD');
        expect(new Date(offer.expiresAt).getTime()).toBeGreaterThan(Date.now());
        expect(offer.metadata.get('pickupDistanceMeters')).toBeLessThanOrEqual(2500);

        // Verify stored in database
        const savedOffer = await Offer.findById(offer._id);
        expect(savedOffer).not.toBeNull();
        expect(savedOffer.status).toBe('DRIVER_PROPOSED');

        // Verify passenger notification
        expect(emitSpy).toHaveBeenCalledWith(
            passenger._id.toString(),
            'dispatch:offer_received',
            expect.objectContaining({ price: 25 })
        );
    });

    test('2. Unmatched passenger cannot be invited (corridor mismatch)', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();

        // Passenger in Marrakech (~240km away)
        const passenger = new User({
            fullName: 'Far Passenger',
            email: `marrakech_${Date.now()}@test.com`,
            password: 'hash',
            role: 'client'
        });
        await passenger.save();

        const unmatchedRoute = new Route({
            userId: passenger._id,
            role: 'client',
            status: 'active',
            startPoint: { type: 'Point', coordinates: [-8.0083, 31.6295], address: 'Marrakech' },
            endPoint: { type: 'Point', coordinates: [-7.9890, 31.6400], address: 'Marrakech City' },
            schedule: { time: '08:30' }
        });
        await unmatchedRoute.save();

        await expect(DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: unmatchedRoute._id.toString(),
            tripId: trip._id.toString()
        })).rejects.toThrow(/not an authoritative corridor match/);
    });

    test('3. Unauthorized driver cannot invite for another driver route', async () => {
        const { driverRoute, trip } = await setupDriverAndRoute();
        const { passengerRoute } = await setupMatchedPassenger();

        // Another driver
        const otherDriver = new User({
            fullName: 'Other Driver',
            email: `other_${Date.now()}@test.com`,
            password: 'hash',
            role: 'driver',
            driverStatus: 'ONLINE',
            verificationStatus: 'verified'
        });
        await otherDriver.save();

        await expect(DispatchServiceV2.invitePassenger(otherDriver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString()
        })).rejects.toThrow(/Unauthorized: driver does not own this route/);
    });

    test('4. Duplicate open offer is rejected', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();
        const { passengerRoute } = await setupMatchedPassenger();

        jest.spyOn(NotificationService, 'emitToPassenger').mockImplementation(() => {});

        // First invite succeeds
        await DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString()
        });

        // Second invite with same driver and passenger must fail
        await expect(DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString()
        })).rejects.toThrow(/Duplicate open offer already exists/);
    });

    test('5. Expired trip cannot receive invitation', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();
        const { passengerRoute } = await setupMatchedPassenger();

        // Mark trip as completed
        trip.status = 'COMPLETED';
        await trip.save();

        await expect(DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString()
        })).rejects.toThrow(/Driver trip is closed or cancelled/);
    });

    test('6. Inactive / OFFLINE driver cannot invite', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();
        const { passengerRoute } = await setupMatchedPassenger();

        // Take driver offline
        driver.driverStatus = 'OFFLINE';
        await driver.save();

        await expect(DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString()
        })).rejects.toThrow(/Driver must be ONLINE/);
    });

    test('7. Already assigned passenger cannot receive invitation', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();
        const { passenger, passengerRoute } = await setupMatchedPassenger();

        // Active journey exists for passenger
        const activeJourney = new PassengerJourney({
            tripInstanceId: new mongoose.Types.ObjectId(),
            passengerId: passenger._id,
            pickupWaypointIndex: 0,
            dropoffWaypointIndex: 1,
            seatsBooked: 1,
            paymentType: 'CASH_ON_BOARDING',
            fareAmountMad: 20,
            verificationOtp: '1234',
            status: 'BOOKED'
        });
        await activeJourney.save();

        await expect(DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString()
        })).rejects.toThrow(/Passenger already has an active ongoing trip/);
    });

    test('8. Invitation does NOT create TripAssignment (Offer != Assignment)', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();
        const { passengerRoute } = await setupMatchedPassenger();

        jest.spyOn(NotificationService, 'emitToPassenger').mockImplementation(() => {});

        await DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString()
        });

        const assignmentCount = await TripAssignment.countDocuments();
        expect(assignmentCount).toBe(0);
    });

    test('9. Invitation does NOT create PassengerJourney', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();
        const { passengerRoute } = await setupMatchedPassenger();

        jest.spyOn(NotificationService, 'emitToPassenger').mockImplementation(() => {});

        await DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString()
        });

        const journeyCount = await PassengerJourney.countDocuments();
        expect(journeyCount).toBe(0);
    });

    test('10. Invitation does NOT perform escrow', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();
        const { passengerRoute } = await setupMatchedPassenger();

        jest.spyOn(NotificationService, 'emitToPassenger').mockImplementation(() => {});

        await DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString()
        });

        const journalCount = await FinancialJournal.countDocuments();
        expect(journalCount).toBe(0);
    });

    test('11. Targeted notification only (no broadcast io.emit)', async () => {
        const { driver, driverRoute, trip } = await setupDriverAndRoute();
        const { passenger, passengerRoute } = await setupMatchedPassenger();

        const mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        };
        NotificationService.io = mockIo;

        await DispatchServiceV2.invitePassenger(driver._id.toString(), {
            driverRouteId: driverRoute._id.toString(),
            clientRouteId: passengerRoute._id.toString(),
            tripId: trip._id.toString(),
            proposedPrice: 30
        });

        // Verify targeted room: user:<passengerId>
        expect(mockIo.to).toHaveBeenCalledWith(`user:${passenger._id.toString()}`);
        expect(mockIo.emit).toHaveBeenCalledWith('dispatch:offer_received', expect.objectContaining({ price: 30 }));

        // Verify io.emit was NOT called as a global broadcast
        // Only mockIo.to(...).emit(...) was called
        expect(mockIo.to).toHaveBeenCalledTimes(1);
    });
});
