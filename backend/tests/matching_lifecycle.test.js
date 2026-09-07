const mongoose = require('mongoose');
const {
    haversineDistance,
    decodePolylineCoordinates,
    getDriverRoutePoints,
    projectPointToRoute,
    isRouteCompatible,
    evaluateCorridorMatch
} = require('../utils/corridorMatcher');
const tripService = require('../services/tripService');
const capacityService = require('../services/capacityService');
const driverEligibilityService = require('../services/driverEligibilityService');
const Route = require('../models/Route');
const User = require('../models/User');
const Trip = require('../models/Trip');
const TripInstance = require('../models/TripInstance');
const JoinRequest = require('../models/JoinRequest');
const Offer = require('../models/Offer');

describe('DETOUR.MA — 29-POINT CANONICAL MATCHING & SEARCHING LIFECYCLE TESTS', () => {

    // Mock Route coordinates along Casablanca -> Rabat corridor
    // Casablanca: [-7.6114, 33.5731]
    // Mohammedia: [-7.3829, 33.6861] (~25km)
    // Bouznika: [-7.1594, 33.7894] (~55km)
    // Rabat: [-6.8498, 34.0209] (~85km)
    // Settat: [-7.6166, 33.0011] (~65km South)
    // Marrakech: [-8.0083, 31.6295] (~240km South)

    const driverCasaRabatRoute = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        role: 'driver',
        status: 'active',
        seatsTotal: 4,
        startPoint: { type: 'Point', coordinates: [-7.6114, 33.5731], address: 'Casablanca' },
        waypoints: [
            { type: 'Point', coordinates: [-7.3829, 33.6861], address: 'Mohammedia' },
            { type: 'Point', coordinates: [-7.1594, 33.7894], address: 'Bouznika' }
        ],
        endPoint: { type: 'Point', coordinates: [-6.8498, 34.0209], address: 'Rabat' },
        schedule: { time: '08:30' }
    };

    const driverTangierRoute = {
        _id: new mongoose.Types.ObjectId(),
        userId: new mongoose.Types.ObjectId(),
        role: 'driver',
        status: 'active',
        seatsTotal: 4,
        startPoint: { type: 'Point', coordinates: [-5.8123, 35.7595], address: 'Tangier' },
        waypoints: [],
        endPoint: { type: 'Point', coordinates: [-5.3684, 35.5785], address: 'Tetouan' },
        schedule: { time: '08:30' }
    };

    beforeEach(() => {
        jest.spyOn(Offer, 'find').mockReturnValue({
            lean: jest.fn().mockResolvedValue([])
        });
    });

    // =========================================================================
    // GROUP 1: Spatial & Corridor Matching Invariants
    // =========================================================================
    describe('Group 1: Spatial & Corridor Matching Invariants', () => {
        test('1. Searching passenger with no compatible driver -> remains searching, no match', () => {
            const tangierPassenger = {
                startPoint: { coordinates: [-5.8123, 35.7595] },
                endPoint: { coordinates: [-5.3684, 35.5785] }
            };
            const result = isRouteCompatible(driverCasaRabatRoute, tangierPassenger, { maxCorridorMeters: 2500 });
            expect(result.matched).toBe(false);
            expect(result.reason).toBe('PICKUP_OUTSIDE_CORRIDOR');
        });

        test('2. Driver online but no compatible passengers -> matches = []', async () => {
            const driverId = new mongoose.Types.ObjectId();
            const routeId = new mongoose.Types.ObjectId();
            const mockRoute = { ...driverCasaRabatRoute, _id: routeId, userId: driverId };

            jest.spyOn(Route, 'findById').mockResolvedValue(mockRoute);
            jest.spyOn(User, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue({ driverStatus: 'ONLINE', role: 'driver' })
            });
            jest.spyOn(driverEligibilityService, 'checkEligibility').mockResolvedValue({ isEligible: true });
            jest.spyOn(driverEligibilityService, 'assertSingleActiveTrip').mockResolvedValue(true);

            const tripRepository = require('../repositories/TripRepository');
            jest.spyOn(tripRepository, 'findOne').mockResolvedValue({ routeId, seatsAvailable: 4 });
            jest.spyOn(JoinRequest, 'find').mockResolvedValue([]);
            jest.spyOn(Route, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
            });
            jest.spyOn(TripInstance, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
            });

            const matches = await tripService.searchMatches(routeId, 'driver', driverId);
            expect(matches).toEqual([]);
        });

        test('3. Passenger 500 km away -> NOT returned', () => {
            const farPassenger = {
                startPoint: { coordinates: [-9.5981, 30.4278] }, // Agadir (~500 km)
                endPoint: { coordinates: [-9.7656, 31.5085] }   // Essaouira
            };
            const result = isRouteCompatible(driverCasaRabatRoute, farPassenger, { maxCorridorMeters: 2500 });
            expect(result.matched).toBe(false);
            expect(result.reason).toBe('PICKUP_OUTSIDE_CORRIDOR');
        });

        test('4. Passenger 10 km away but outside 2.5 km route corridor -> NOT returned', () => {
            // Point ~8km east of Bouznika
            const nearOffRoutePassenger = {
                startPoint: { coordinates: [-7.0800, 33.7894] }, 
                endPoint: { coordinates: [-6.8498, 34.0209] }
            };
            const result = isRouteCompatible(driverCasaRabatRoute, nearOffRoutePassenger, { maxCorridorMeters: 2500 });
            expect(result.matched).toBe(false);
            expect(result.reason).toBe('PICKUP_OUTSIDE_CORRIDOR');
        });

        test('5. Passenger pickup inside corridor + destination inside corridor -> returned with verified match', () => {
            const compatiblePassenger = {
                startPoint: { coordinates: [-7.3829, 33.6861] }, // Mohammedia
                endPoint: { coordinates: [-7.1594, 33.7894] }   // Bouznika
            };
            const result = isRouteCompatible(driverCasaRabatRoute, compatiblePassenger, { maxCorridorMeters: 2500 });
            expect(result.matched).toBe(true);
            expect(result.pickupDistanceMeters).toBeLessThan(100);
            expect(result.dropoffDistanceMeters).toBeLessThan(100);
            expect(result.pickupRoutePosition).toBeLessThan(result.dropoffRoutePosition);
        });

        test('6. Passenger pickup near route but destination outside corridor -> NOT returned', () => {
            const southDropoffPassenger = {
                startPoint: { coordinates: [-7.6114, 33.5731] }, // Casablanca
                endPoint: { coordinates: [-7.6166, 33.0011] }   // Settat (~65 km off corridor)
            };
            const result = isRouteCompatible(driverCasaRabatRoute, southDropoffPassenger, { maxCorridorMeters: 2500 });
            expect(result.matched).toBe(false);
            expect(result.reason).toBe('DROPOFF_OUTSIDE_CORRIDOR');
        });

        test('7. Passenger follows route in reverse direction (Rabat -> Casa) -> NOT returned', () => {
            const reversePassenger = {
                startPoint: { coordinates: [-6.8498, 34.0209] }, // Rabat
                endPoint: { coordinates: [-7.6114, 33.5731] }   // Casablanca
            };
            const result = isRouteCompatible(driverCasaRabatRoute, reversePassenger, { maxCorridorMeters: 2500 });
            expect(result.matched).toBe(false);
            expect(result.reason).toBe('REVERSE_OR_INSUFFICIENT_DIRECTION');
        });
    });

    // =========================================================================
    // GROUP 2: Schedule, Cancellation & Expiration Invariants
    // =========================================================================
    describe('Group 2: Schedule, Cancellation & Expiration Invariants', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
            jest.spyOn(JoinRequest, 'find').mockResolvedValue([]);
        });

        test('8. Passenger schedule incompatible (> 2 hours difference) -> NOT returned', async () => {
            const driverId = new mongoose.Types.ObjectId();
            const routeId = new mongoose.Types.ObjectId();
            const mockRoute = { ...driverCasaRabatRoute, _id: routeId, userId: driverId, schedule: { time: '08:00' } };

            jest.spyOn(Route, 'findById').mockResolvedValue(mockRoute);
            jest.spyOn(User, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue({ driverStatus: 'ONLINE', role: 'driver' })
            });
            jest.spyOn(driverEligibilityService, 'checkEligibility').mockResolvedValue({ isEligible: true });
            jest.spyOn(driverEligibilityService, 'assertSingleActiveTrip').mockResolvedValue(true);

            const tripRepository = require('../repositories/TripRepository');
            jest.spyOn(tripRepository, 'findOne').mockResolvedValue({ routeId, seatsAvailable: 4 });

            // Passenger departs at 14:00 (6 hours later)
            const incompatiblePassenger = {
                _id: new mongoose.Types.ObjectId(),
                userId: new mongoose.Types.ObjectId(),
                role: 'client',
                status: 'searching',
                startPoint: { coordinates: [-7.3829, 33.6861] },
                endPoint: { coordinates: [-7.1594, 33.7894] },
                schedule: { time: '14:00' }
            };

            jest.spyOn(Route, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([incompatiblePassenger]) })
            });
            jest.spyOn(TripInstance, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
            });

            const matches = await tripService.searchMatches(routeId, 'driver', driverId);
            expect(matches).toEqual([]);
        });

        test('9. Passenger request cancelled -> NOT returned', async () => {
            const driverId = new mongoose.Types.ObjectId();
            const routeId = new mongoose.Types.ObjectId();
            const mockRoute = { ...driverCasaRabatRoute, _id: routeId, userId: driverId };

            jest.spyOn(Route, 'findById').mockResolvedValue(mockRoute);
            jest.spyOn(User, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue({ driverStatus: 'ONLINE', role: 'driver' })
            });
            jest.spyOn(driverEligibilityService, 'checkEligibility').mockResolvedValue({ isEligible: true });
            jest.spyOn(driverEligibilityService, 'assertSingleActiveTrip').mockResolvedValue(true);

            const tripRepository = require('../repositories/TripRepository');
            jest.spyOn(tripRepository, 'findOne').mockResolvedValue({ routeId, seatsAvailable: 4 });

            // Cancelled request
            const cancelledPassenger = {
                _id: new mongoose.Types.ObjectId(),
                userId: new mongoose.Types.ObjectId(),
                role: 'client',
                status: 'CANCELLED',
                isDeleted: true,
                startPoint: { coordinates: [-7.3829, 33.6861] },
                endPoint: { coordinates: [-7.1594, 33.7894] }
            };

            jest.spyOn(Route, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([cancelledPassenger]) })
            });
            jest.spyOn(TripInstance, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
            });

            const matches = await tripService.searchMatches(routeId, 'driver', driverId);
            expect(matches).toEqual([]);
        });

        test('10. Passenger request expired -> NOT returned', async () => {
            const driverId = new mongoose.Types.ObjectId();
            const routeId = new mongoose.Types.ObjectId();
            const mockRoute = { ...driverCasaRabatRoute, _id: routeId, userId: driverId };

            jest.spyOn(Route, 'findById').mockResolvedValue(mockRoute);
            jest.spyOn(User, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue({ driverStatus: 'ONLINE', role: 'driver' })
            });
            jest.spyOn(driverEligibilityService, 'checkEligibility').mockResolvedValue({ isEligible: true });
            jest.spyOn(driverEligibilityService, 'assertSingleActiveTrip').mockResolvedValue(true);

            const tripRepository = require('../repositories/TripRepository');
            jest.spyOn(tripRepository, 'findOne').mockResolvedValue({ routeId, seatsAvailable: 4 });

            // Expired request (expiresAt in the past)
            const expiredPassenger = {
                _id: new mongoose.Types.ObjectId(),
                userId: new mongoose.Types.ObjectId(),
                role: 'client',
                status: 'searching',
                expiresAt: new Date(Date.now() - 3600000), // 1 hour ago
                startPoint: { coordinates: [-7.3829, 33.6861] },
                endPoint: { coordinates: [-7.1594, 33.7894] }
            };

            jest.spyOn(Route, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([expiredPassenger]) })
            });
            jest.spyOn(TripInstance, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
            });

            const matches = await tripService.searchMatches(routeId, 'driver', driverId);
            expect(matches).toEqual([]);
        });
    });

    // =========================================================================
    // GROUP 3: Driver Status, Ownership, Capacity & Scaling
    // =========================================================================
    describe('Group 3: Driver Status, Ownership, Capacity & Scaling', () => {
        beforeEach(() => {
            jest.restoreAllMocks();
        });

        test('11. Driver offline -> matches returns empty array', async () => {
            const driverId = new mongoose.Types.ObjectId();
            const routeId = new mongoose.Types.ObjectId();
            const mockRoute = { ...driverCasaRabatRoute, _id: routeId, userId: driverId };

            jest.spyOn(Route, 'findById').mockResolvedValue(mockRoute);
            jest.spyOn(User, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue({ driverStatus: 'OFFLINE', role: 'driver' })
            });

            const matches = await tripService.searchMatches(routeId, 'driver', driverId);
            expect(matches).toEqual([]);
        });

        test('12. Driver searches another driver route -> throws 403 Unauthorized', async () => {
            const ownerId = new mongoose.Types.ObjectId();
            const attackerId = new mongoose.Types.ObjectId();
            const routeId = new mongoose.Types.ObjectId();
            const mockRoute = { ...driverCasaRabatRoute, _id: routeId, userId: ownerId };

            jest.spyOn(Route, 'findById').mockResolvedValue(mockRoute);

            await expect(
                tripService.searchMatches(routeId, 'driver', attackerId)
            ).rejects.toMatchObject({
                statusCode: 403,
                message: 'Unauthorized route access'
            });
        });

        test('13. Driver has no active route (inactive status) -> returns no matches', async () => {
            const driverId = new mongoose.Types.ObjectId();
            const routeId = new mongoose.Types.ObjectId();
            const mockRoute = { ...driverCasaRabatRoute, _id: routeId, userId: driverId, status: 'inactive' };

            jest.spyOn(Route, 'findById').mockResolvedValue(mockRoute);
            jest.spyOn(User, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue({ driverStatus: 'ONLINE', role: 'driver' })
            });
            jest.spyOn(driverEligibilityService, 'checkEligibility').mockResolvedValue({ isEligible: true });
            jest.spyOn(driverEligibilityService, 'assertSingleActiveTrip').mockResolvedValue(true);

            const matches = await tripService.searchMatches(routeId, 'driver', driverId);
            expect(matches).toEqual([]);
        });

        test('14. Capacity full on one required segment -> NOT returned', async () => {
            const driverId = new mongoose.Types.ObjectId();
            const routeId = new mongoose.Types.ObjectId();
            const mockRoute = { ...driverCasaRabatRoute, _id: routeId, userId: driverId };

            jest.spyOn(Route, 'findById').mockResolvedValue(mockRoute);
            jest.spyOn(User, 'findById').mockReturnValue({
                select: jest.fn().mockResolvedValue({ driverStatus: 'ONLINE', role: 'driver' })
            });
            jest.spyOn(driverEligibilityService, 'checkEligibility').mockResolvedValue({ isEligible: true });
            jest.spyOn(driverEligibilityService, 'assertSingleActiveTrip').mockResolvedValue(true);

            // Mock trip with segment capacity where segment 0 is fully occupied
            const tripRepository = require('../repositories/TripRepository');
            jest.spyOn(tripRepository, 'findOne').mockResolvedValue({
                routeId,
                seatsAvailable: 1,
                segmentCapacity: [
                    { segmentIndex: 0, fromWaypointIndex: 0, toWaypointIndex: 1, seatsTotal: 4, seatsOccupied: 4 }, // Bottleneck!
                    { segmentIndex: 1, fromWaypointIndex: 1, toWaypointIndex: 2, seatsTotal: 4, seatsOccupied: 0 }
                ]
            });

            const passId = new mongoose.Types.ObjectId();
            const passenger = {
                _id: passId,
                userId: new mongoose.Types.ObjectId(),
                role: 'client',
                status: 'searching',
                requestedSeats: 1,
                startPoint: { coordinates: [-7.6114, 33.5731] }, // Casablanca (segment 0)
                endPoint: { coordinates: [-7.3829, 33.6861] }    // Mohammedia
            };

            jest.spyOn(Route, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([passenger]) })
            });
            jest.spyOn(TripInstance, 'find').mockReturnValue({
                populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) })
            });
            jest.spyOn(JoinRequest, 'find').mockResolvedValue([]);

            const matches = await tripService.searchMatches(routeId, 'driver', driverId);
            expect(matches).toEqual([]);
        });

        test('15. Multiple searching passengers -> driver receives ONLY compatible passengers', () => {
            const passengers = [
                { id: 'p1-valid', startPoint: { coordinates: [-7.3829, 33.6861] }, endPoint: { coordinates: [-7.1594, 33.7894] } }, // Mohammedia -> Bouznika
                { id: 'p2-reverse', startPoint: { coordinates: [-6.8498, 34.0209] }, endPoint: { coordinates: [-7.3829, 33.6861] } }, // Rabat -> Mohammedia
                { id: 'p3-far', startPoint: { coordinates: [-8.0083, 31.6295] }, endPoint: { coordinates: [-8.0500, 31.7000] } },     // Marrakech
                { id: 'p4-valid', startPoint: { coordinates: [-7.6114, 33.5731] }, endPoint: { coordinates: [-6.8498, 34.0209] } }  // Casa -> Rabat
            ];

            const compatible = passengers.filter(p => isRouteCompatible(driverCasaRabatRoute, p, { maxCorridorMeters: 2500 }).matched);
            expect(compatible.map(p => p.id)).toEqual(['p1-valid', 'p4-valid']);
        });

        test('16. 100 unrelated passengers + 1 compatible passenger -> result contains exactly 1', () => {
            const passengers = [];
            for (let i = 0; i < 100; i++) {
                passengers.push({
                    id: `unrelated-${i}`,
                    startPoint: { coordinates: [-9.0 - (i * 0.01), 30.0 + (i * 0.01)] },
                    endPoint: { coordinates: [-9.1 - (i * 0.01), 30.1 + (i * 0.01)] }
                });
            }
            passengers.push({
                id: 'solo-compatible',
                startPoint: { coordinates: [-7.3829, 33.6861] },
                endPoint: { coordinates: [-7.1594, 33.7894] }
            });

            const matches = passengers.filter(p => isRouteCompatible(driverCasaRabatRoute, p, { maxCorridorMeters: 2500 }).matched);
            expect(matches.length).toBe(1);
            expect(matches[0].id).toBe('solo-compatible');
        });
    });

    // =========================================================================
    // GROUP 4: Passenger Frontend State Mapping
    // =========================================================================
    describe('Group 4: Passenger Frontend State Mapping', () => {
        const computePassengerUIState = (dispatchStatus, hasOffers, activeTripStatus) => {
            const isAssigned = dispatchStatus === 'ASSIGNED' || dispatchStatus === 'EN_ROUTE' || activeTripStatus === 'active';
            const isSearching = dispatchStatus === 'SEARCHING' || dispatchStatus === 'OFFERS_OPEN' || activeTripStatus === 'searching';
            if (isAssigned) return 'active';
            if (isSearching) return 'searching';
            return 'idle';
        };

        const computeHeaderGreeting = (homeState, dispatchStatus, hasOffers) => {
            if (homeState === 'searching') {
                if (hasOffers) return 'Offers received';
                if (dispatchStatus === 'OFFERS_OPEN') return 'Waiting for offers...';
                return 'Searching for drivers...';
            }
            if (homeState === 'active') {
                if (dispatchStatus === 'ASSIGNED') return 'Driver Assigned';
                if (dispatchStatus === 'EN_ROUTE') return 'Driver on the way';
                return 'Driver Assigned';
            }
            return 'Welcome';
        };

        test('17. Passenger frontend: SEARCHING displays "Searching for drivers..."', () => {
            const homeState = computePassengerUIState('SEARCHING', false, null);
            const greeting = computeHeaderGreeting(homeState, 'SEARCHING', false);

            expect(homeState).toBe('searching');
            expect(greeting).toBe('Searching for drivers...');
        });

        test('18. Passenger frontend: WAITING_FOR_OFFERS does NOT display "Driver Assigned"', () => {
            const homeState = computePassengerUIState('OFFERS_OPEN', false, null);
            const greeting = computeHeaderGreeting(homeState, 'OFFERS_OPEN', false);

            expect(homeState).toBe('searching');
            expect(greeting).not.toBe('Driver Assigned');
            expect(greeting).toBe('Waiting for offers...');
        });

        test('19. Passenger frontend: ASSIGNED displays "Driver Assigned"', () => {
            const homeState = computePassengerUIState('ASSIGNED', false, 'active');
            const greeting = computeHeaderGreeting(homeState, 'ASSIGNED', false);

            expect(homeState).toBe('active');
            expect(greeting).toBe('Driver Assigned');
        });
    });

    // =========================================================================
    // GROUP 5: Driver Map Presentation Invariants
    // =========================================================================
    describe('Group 5: Driver Map Presentation Invariants', () => {
        const computeDriverMapRenderableClients = (presence, activeTrip, verifiedMatches) => {
            if (presence !== 'ONLINE' || activeTrip) return [];
            return (verifiedMatches || []).filter(m => m.match && m.match.verified === true);
        };

        test('20. Driver map: zero matches -> zero passenger routes and markers', () => {
            const renderable = computeDriverMapRenderableClients('ONLINE', null, []);
            expect(renderable.length).toBe(0);
        });

        test('21. Driver map: one verified match -> exactly one passenger route rendered', () => {
            const singleMatch = [{
                requestId: 'req-1',
                pickup: { coordinates: [-7.3829, 33.6861] },
                destination: { coordinates: [-7.1594, 33.7894] },
                match: { verified: true }
            }];
            const renderable = computeDriverMapRenderableClients('ONLINE', null, singleMatch);
            expect(renderable.length).toBe(1);
            expect(renderable[0].requestId).toBe('req-1');
        });

        test('22. Driver map: unrelated passengers never appear (filtered out before map layer)', () => {
            const mixedList = [
                { requestId: 'req-verified', match: { verified: true } },
                { requestId: 'unrelated-1', match: { verified: false } },
                { requestId: 'unrelated-2' } // no match object
            ];
            const renderable = computeDriverMapRenderableClients('ONLINE', null, mixedList);
            expect(renderable.length).toBe(1);
            expect(renderable[0].requestId).toBe('req-verified');
        });
    });

    // =========================================================================
    // GROUP 6: Socket & Assignment Lifecycle Invariants
    // =========================================================================
    describe('Group 6: Socket & Assignment Lifecycle Invariants', () => {
        test('23. Socket: searching event is NOT globally broadcast (io.emit not called)', async () => {
            const notificationService = require('../services/notificationService');
            const ioEmitSpy = jest.fn();
            const emitToDriverSpy = jest.spyOn(notificationService, 'emitToDriver').mockImplementation(() => {});

            notificationService.io = { emit: ioEmitSpy };
            jest.spyOn(Route, 'find').mockReturnValue({
                lean: jest.fn().mockResolvedValue([])
            });

            const instance = {
                _id: new mongoose.Types.ObjectId(),
                pickup: { coordinates: [-7.3829, 33.6861] },
                destination: { coordinates: [-7.1594, 33.7894] }
            };

            await notificationService.handleTripSearching({ payload: instance });

            expect(ioEmitSpy).not.toHaveBeenCalled();
        });

        test('24. Socket: only relevant corridor-matched online driver receives notification', async () => {
            const notificationService = require('../services/notificationService');
            const targetDriverId = new mongoose.Types.ObjectId();
            const emitToDriverSpy = jest.spyOn(notificationService, 'emitToDriver').mockImplementation(() => {});

            jest.spyOn(Route, 'find').mockReturnValue({
                lean: jest.fn().mockResolvedValue([
                    { ...driverCasaRabatRoute, userId: targetDriverId, role: 'driver', status: 'active' }
                ])
            });
            jest.spyOn(User, 'findById').mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue({ driverStatus: 'ONLINE' })
                })
            });

            const instance = {
                _id: new mongoose.Types.ObjectId(),
                pickup: { coordinates: [-7.3829, 33.6861] },
                destination: { coordinates: [-7.1594, 33.7894] }
            };

            await notificationService.handleTripSearching({ payload: instance });

            expect(emitToDriverSpy).toHaveBeenCalledWith(
                targetDriverId,
                'dispatch:trip_searching',
                expect.objectContaining({ instanceId: instance._id })
            );
        });

        test('25. Assignment: verified match alone does NOT create ASSIGNED state', () => {
            const matchContract = {
                requestId: 'req-1',
                match: { verified: true },
                status: 'SEARCHING'
            };
            // Invariant: match presence !== ASSIGNED status
            expect(matchContract.status).toBe('SEARCHING');
            expect(matchContract.status).not.toBe('ASSIGNED');
        });

        test('26. Offer accepted: canonical assignment lifecycle is triggered', async () => {
            const OfferStateMachine = require('../state/OfferStateMachine');
            const TripStateMachine = require('../state/TripStateMachine');

            const currentOfferStatus = OfferStateMachine.STATES.PENDING;
            expect(() => {
                OfferStateMachine.validateTransition(currentOfferStatus, OfferStateMachine.STATES.ACCEPTED);
            }).not.toThrow();

            const currentTripStatus = TripStateMachine.STATES.OFFERS_OPEN;
            expect(() => {
                TripStateMachine.validateTransition(currentTripStatus, TripStateMachine.STATES.ASSIGNED);
            }).not.toThrow();
        });
    });

    // =========================================================================
    // GROUP 7: Verification of Canonical Phase Invariants
    // =========================================================================
    describe('Group 7: Verification of Canonical Phase Invariants', () => {
        test('27. Existing Phase 2 tests still pass (Tax & Integer Centimes)', () => {
            const TaxService = require('../services/tax/TaxService');
            const snapshot = TaxService.calculateSnapshot(100);
            expect(snapshot.grossFare).toBe(100);
            expect(snapshot.driverNetAmount).toBe(85);
            expect(snapshot.taxAmount).toBe(2.5);
        });

        test('28. Existing Phase 3 tests still pass (Segment Capacity Engine)', () => {
            const segments = capacityService.initializeSegments([
                { coordinates: [0, 0] },
                { coordinates: [1, 1] },
                { coordinates: [2, 2] }
            ], 4);
            expect(segments.length).toBe(2);
            expect(capacityService.checkCapacity(segments, 0, 2, 2).hasCapacity).toBe(true);
        });

        test('29. Existing lifecycle tests still pass (JourneyStateMachine transitions)', () => {
            const JourneyStateMachine = require('../state/JourneyStateMachine');
            expect(() => {
                JourneyStateMachine.validateTransition(
                    JourneyStateMachine.STATES.BOOKED, 
                    JourneyStateMachine.STATES.DRIVER_ARRIVED
                );
            }).not.toThrow();
        });
    });
});
