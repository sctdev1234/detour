const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const OfferAcceptanceEngine = require('../services/offerAcceptanceEngine');
const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const TripAssignment = require('../models/TripAssignment');
const PassengerJourney = require('../models/PassengerJourney');
const User = require('../models/User');
const FinancialJournal = require('../models/FinancialJournal');
const FinancialLedgerEntry = require('../models/FinancialLedgerEntry');
const IdempotencyKey = require('../models/IdempotencyKey');
const capacityService = require('../services/capacityService');
const escrowService = require('../services/escrowService');

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
    await FinancialJournal.createCollection();
    await FinancialLedgerEntry.createCollection();
    await IdempotencyKey.createCollection();
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
    await IdempotencyKey.deleteMany({});
});

describe('Phase 3: Canonical Atomic Offer Acceptance Engine', () => {

    async function createTestFixtures(options = {}) {
        const passenger = new User({
            fullName: 'Test Passenger',
            email: `passenger_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'client',
            walletBalance: options.passengerBalance !== undefined ? options.passengerBalance : 100,
            heldBalance: 0,
            status: options.passengerStatus || 'ACTIVE'
        });
        await passenger.save();

        const driver = new User({
            fullName: 'Test Driver',
            email: `driver_${Date.now()}_${Math.random()}@test.com`,
            password: 'hash',
            role: 'driver',
            walletBalance: options.driverBalance !== undefined ? options.driverBalance : 200,
            heldBalance: 0,
            driverStatus: options.driverStatus || 'ONLINE'
        });
        await driver.save();

        const instance = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            passengerIds: [passenger._id],
            pickup: { type: 'Point', coordinates: [-7.5898, 33.5731], address: 'Casablanca' },
            destination: { type: 'Point', coordinates: [-6.8498, 34.0208], address: 'Rabat' },
            scheduledTime: new Date(),
            seatCapacity: options.seatCapacity || 4,
            status: options.instanceStatus || 'OFFERS_OPEN'
        });
        await instance.save();

        const offer = new Offer({
            tripInstanceId: instance._id,
            driverId: driver._id,
            passengerId: passenger._id,
            price: options.fare || 40,
            paymentType: options.paymentType || 'DIGITAL',
            status: options.offerStatus || 'PENDING',
            expiresAt: options.expiresAt || new Date(Date.now() + 60000)
        });
        await offer.save();

        return { passenger, driver, instance, offer };
    }

    test('1. successful digital acceptance: reserves capacity, holds escrow, creates assignment & journey, sets status', async () => {
        const { passenger, driver, instance, offer } = await createTestFixtures({ fare: 40 });

        const assignment = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id);

        expect(assignment).toBeDefined();
        expect(assignment.driverId.toString()).toBe(driver._id.toString());
        expect(assignment.status).toBe('ACTIVE');

        // Verify TripInstance is ASSIGNED
        const updatedInstance = await TripInstance.findById(instance._id);
        expect(updatedInstance.status).toBe('ASSIGNED');
        expect(updatedInstance.driverId.toString()).toBe(driver._id.toString());
        expect(updatedInstance.assignmentId.toString()).toBe(assignment._id.toString());

        // Verify Capacity reservation on [i, j-1]
        expect(updatedInstance.segmentCapacity.length).toBeGreaterThan(0);
        expect(updatedInstance.segmentCapacity[0].seatsOccupied).toBe(1);

        // Verify exactly one PassengerJourney
        const journeys = await PassengerJourney.find({ tripInstanceId: instance._id });
        expect(journeys.length).toBe(1);
        const journey = journeys[0];
        expect(journey.status).toBe('BOOKED');
        expect(journey.verificationOtp).toMatch(/^[0-9]{4}$/);
        expect(journey.fareAmountMad).toBe(40);
        expect(journey.paymentType).toBe('DIGITAL_ESCROW');

        // Verify Offer status is ACCEPTED
        const updatedOffer = await Offer.findById(offer._id);
        expect(updatedOffer.status).toBe('ACCEPTED');

        // Verify Digital Escrow journal entries
        const updatedPassenger = await User.findById(passenger._id);
        expect(updatedPassenger.walletBalance).toBe(60); // 100 - 40
        expect(updatedPassenger.heldBalance).toBe(40);

        const journal = await FinancialJournal.findById(journey.escrowJournalId);
        expect(journal).toBeDefined();
        expect(journal.referenceType).toBe('ESCROW_HOLD_DIGITAL');
        expect(journal.totalDebitCentimes).toBe(4000);
        expect(journal.totalCreditCentimes).toBe(4000);
    });

    test('2. successful cash acceptance: reserves commission from driver wallet', async () => {
        const { passenger, driver, instance, offer } = await createTestFixtures({
            fare: 50,
            paymentType: 'CASH'
        });

        const assignment = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id);

        expect(assignment).toBeDefined();
        expect(assignment.status).toBe('ACTIVE');

        // Verify PassengerJourney
        const journey = await PassengerJourney.findOne({ tripInstanceId: instance._id });
        expect(journey.paymentType).toBe('CASH_ON_BOARDING');
        expect(journey.fareAmountMad).toBe(50);

        // Driver 15% commission hold = 7.50 MAD (750 centimes)
        const updatedDriver = await User.findById(driver._id);
        expect(updatedDriver.walletBalance).toBe(192.5); // 200 - 7.5
        expect(updatedDriver.heldBalance).toBe(7.5);

        const journal = await FinancialJournal.findById(journey.escrowJournalId);
        expect(journal.referenceType).toBe('ESCROW_HOLD_CASH_COMMISSION');
        expect(journal.totalDebitCentimes).toBe(750);
        expect(journal.totalCreditCentimes).toBe(750);
    });

    test('3. insufficient passenger funds: throws error and rolls back without mutations', async () => {
        const { passenger, instance, offer } = await createTestFixtures({
            passengerBalance: 15,
            fare: 40
        });

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id))
            .rejects
            .toThrow(/Insufficient wallet balance/);

        // Assert TripInstance status untouched
        const updatedInstance = await TripInstance.findById(instance._id);
        expect(updatedInstance.status).toBe('OFFERS_OPEN');

        // Assert no assignment created
        const assignmentCount = await TripAssignment.countDocuments({ tripInstanceId: instance._id });
        expect(assignmentCount).toBe(0);

        // Assert no journey created
        const journeyCount = await PassengerJourney.countDocuments({ tripInstanceId: instance._id });
        expect(journeyCount).toBe(0);
    });

    test('4. insufficient driver commission balance: fails when driver wallet balance below minimum', async () => {
        const { passenger, instance, offer } = await createTestFixtures({
            driverBalance: 30, // Below mandatory 50 MAD min for cash
            fare: 50,
            paymentType: 'CASH'
        });

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id))
            .rejects
            .toThrow(/below mandatory minimum 50 MAD/);

        const assignmentCount = await TripAssignment.countDocuments({ tripInstanceId: instance._id });
        expect(assignmentCount).toBe(0);
    });

    test('5. insufficient capacity: fails and rolls back when vehicle is full', async () => {
        const { passenger, instance, offer } = await createTestFixtures({
            seatCapacity: 1
        });

        // Artificially saturate segment capacity
        instance.segmentCapacity = [{
            segmentIndex: 0,
            fromWaypointIndex: 0,
            toWaypointIndex: 1,
            seatsTotal: 1,
            seatsOccupied: 1
        }];
        await instance.save();

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id))
            .rejects
            .toThrow(/Insufficient seat capacity/);

        const assignmentCount = await TripAssignment.countDocuments({ tripInstanceId: instance._id });
        expect(assignmentCount).toBe(0);
    });

    test('6. expired offer: rejects with Offer has expired and sets EXPIRED status', async () => {
        const { passenger, offer } = await createTestFixtures({
            expiresAt: new Date(Date.now() - 5000) // 5 seconds in past
        });

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id))
            .rejects
            .toThrow(/Offer has expired/);

        const updatedOffer = await Offer.findById(offer._id);
        expect(updatedOffer.status).toBe('EXPIRED');
    });

    test('7. already accepted offer: idempotent replay returns existing assignment', async () => {
        const { passenger, offer } = await createTestFixtures({ fare: 30 });

        const firstAssignment = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id);
        expect(firstAssignment).toBeDefined();

        // Second acceptance of the already accepted offer
        const secondAssignment = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id);
        expect(secondAssignment._id.toString()).toBe(firstAssignment._id.toString());

        // Verify exactly one assignment and one journey exist
        const assignmentCount = await TripAssignment.countDocuments({ tripInstanceId: offer.tripInstanceId });
        expect(assignmentCount).toBe(1);

        const journeyCount = await PassengerJourney.countDocuments({ tripInstanceId: offer.tripInstanceId });
        expect(journeyCount).toBe(1);
    });

    test('8. passenger unauthorized: rejects if passenger is not owner of offer', async () => {
        const { offer } = await createTestFixtures({});
        const intruder = new User({
            fullName: 'Intruder',
            email: 'intruder@test.com',
            password: 'hash',
            role: 'client',
            walletBalance: 100
        });
        await intruder.save();

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, intruder._id))
            .rejects
            .toThrow(/Unauthorized/);
    });

    test('9. driver already active: prevents driver with active running trip from accepting', async () => {
        const { passenger, driver, offer } = await createTestFixtures({});

        // Create an existing active trip instance for the driver
        const activeTrip = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            driverId: driver._id,
            passengerIds: [new mongoose.Types.ObjectId()],
            pickup: { type: 'Point', coordinates: [0, 0], address: 'A' },
            destination: { type: 'Point', coordinates: [1, 1], address: 'B' },
            scheduledTime: new Date(),
            status: 'IN_PROGRESS'
        });
        await activeTrip.save();

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id))
            .rejects
            .toThrow(/already has an active trip in progress/);
    });

    test('10. duplicate request / Idempotency-Key: repeated calls return cached response without duplicate mutations', async () => {
        const { passenger, offer } = await createTestFixtures({ fare: 25 });
        const idempotencyKey = 'idem-phase3-test-' + Date.now();

        const context = {
            idempotencyKey,
            endpoint: `/api/v2/dispatch/offer/${offer._id}/accept`,
            reqBody: {}
        };

        const res1 = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id, context);
        expect(res1).toBeDefined();

        // Repeat request with exact same Idempotency-Key
        const res2 = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id, context);
        expect(res2).toBeDefined();

        // Check DB documents count
        const assignmentCount = await TripAssignment.countDocuments({ tripInstanceId: offer.tripInstanceId });
        expect(assignmentCount).toBe(1);

        const journeyCount = await PassengerJourney.countDocuments({ tripInstanceId: offer.tripInstanceId });
        expect(journeyCount).toBe(1);

        const journalsCount = await FinancialJournal.countDocuments({ referenceType: 'ESCROW_HOLD_DIGITAL' });
        expect(journalsCount).toBe(1);
    });

    test('11. concurrent acceptance: only one succeeds or all resolve to same assignment', async () => {
        const { passenger, offer } = await createTestFixtures({ fare: 20 });

        const calls = [
            OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id),
            OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id),
            OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id)
        ];

        const results = await Promise.allSettled(calls);
        const successful = results.filter(r => r.status === 'fulfilled');
        expect(successful.length).toBeGreaterThan(0);

        // All successful returns must resolve to the identical assignment ID
        const firstId = successful[0].value._id.toString();
        for (const res of successful) {
            expect(res.value._id.toString()).toBe(firstId);
        }

        // Exactly one assignment in DB
        const count = await TripAssignment.countDocuments({ tripInstanceId: offer.tripInstanceId });
        expect(count).toBe(1);
    });

    test('12. competing offers rejected: all other open offers on instance become REJECTED', async () => {
        const { passenger, instance, offer } = await createTestFixtures({});

        const competitor1 = new User({ fullName: 'C1', email: 'c1@test.com', password: 'p', role: 'driver', walletBalance: 100, driverStatus: 'ONLINE' });
        await competitor1.save();
        const competingOffer1 = new Offer({
            tripInstanceId: instance._id,
            driverId: competitor1._id,
            passengerId: passenger._id,
            price: 50,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 60000)
        });
        await competingOffer1.save();

        const competitor2 = new User({ fullName: 'C2', email: 'c2@test.com', password: 'p', role: 'driver', walletBalance: 100, driverStatus: 'ONLINE' });
        await competitor2.save();
        const competingOffer2 = new Offer({
            tripInstanceId: instance._id,
            driverId: competitor2._id,
            passengerId: passenger._id,
            price: 55,
            status: 'DRIVER_PROPOSED',
            expiresAt: new Date(Date.now() + 60000)
        });
        await competingOffer2.save();

        await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id);

        const updatedComp1 = await Offer.findById(competingOffer1._id);
        const updatedComp2 = await Offer.findById(competingOffer2._id);
        expect(updatedComp1.status).toBe('REJECTED');
        expect(updatedComp2.status).toBe('REJECTED');
    });

    test('13. rollback when escrow fails: no assignment, journey, or capacity reserved', async () => {
        const { passenger, instance, offer } = await createTestFixtures({ fare: 30 });

        // Spy on escrowService.holdDigitalEscrow to force failure inside transaction
        const escrowSpy = jest.spyOn(escrowService, 'holdDigitalEscrow').mockRejectedValueOnce(new Error('Simulated Escrow Failure'));

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id))
            .rejects
            .toThrow('Simulated Escrow Failure');

        escrowSpy.mockRestore();

        // Assert database state is completely pristine
        const dbAssignment = await TripAssignment.findOne({ tripInstanceId: instance._id });
        expect(dbAssignment).toBeNull();

        const dbJourney = await PassengerJourney.findOne({ tripInstanceId: instance._id });
        expect(dbJourney).toBeNull();

        const dbInstance = await TripInstance.findById(instance._id);
        expect(dbInstance.status).toBe('OFFERS_OPEN');

        const dbOffer = await Offer.findById(offer._id);
        expect(dbOffer.status).toBe('PENDING');
    });

    test('14. rollback when capacity fails: no assignment or escrow held', async () => {
        const { passenger, instance, offer } = await createTestFixtures({ fare: 30 });

        const capacitySpy = jest.spyOn(capacityService, 'reserveSeats').mockImplementationOnce(() => {
            throw new Error('Simulated Capacity Failure');
        });

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id))
            .rejects
            .toThrow('Simulated Capacity Failure');

        capacitySpy.mockRestore();

        const dbAssignment = await TripAssignment.findOne({ tripInstanceId: instance._id });
        expect(dbAssignment).toBeNull();

        const dbJourney = await PassengerJourney.findOne({ tripInstanceId: instance._id });
        expect(dbJourney).toBeNull();
    });

    test('15. rollback when journey creation fails: no assignment or escrow mutation', async () => {
        const { passenger, instance, offer } = await createTestFixtures({ fare: 30 });

        const journeySpy = jest.spyOn(PassengerJourney.prototype, 'save').mockRejectedValueOnce(new Error('Simulated Journey DB Error'));

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id))
            .rejects
            .toThrow('Simulated Journey DB Error');

        journeySpy.mockRestore();

        const dbAssignment = await TripAssignment.findOne({ tripInstanceId: instance._id });
        expect(dbAssignment).toBeNull();

        const dbJournals = await FinancialJournal.find({ referenceId: instance._id });
        expect(dbJournals.length).toBe(0);
    });

    test('16. rollback when assignment creation fails: entire transaction rolls back', async () => {
        const { passenger, instance, offer } = await createTestFixtures({ fare: 30 });

        const assignmentSpy = jest.spyOn(TripAssignment.prototype, 'save').mockRejectedValueOnce(new Error('Simulated Assignment DB Error'));

        await expect(OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id))
            .rejects
            .toThrow('Simulated Assignment DB Error');

        assignmentSpy.mockRestore();

        const dbInstance = await TripInstance.findById(instance._id);
        expect(dbInstance.status).toBe('OFFERS_OPEN');

        const dbJourneys = await PassengerJourney.find({ tripInstanceId: instance._id });
        expect(dbJourneys.length).toBe(0);
    });

    test('17. exactly one assignment, journey, escrow journal, capacity reservation under repeated calls', async () => {
        const { passenger, instance, offer } = await createTestFixtures({ fare: 35 });

        await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id);
        await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id);
        await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id);

        const assignments = await TripAssignment.find({ tripInstanceId: instance._id });
        expect(assignments.length).toBe(1);

        const journeys = await PassengerJourney.find({ tripInstanceId: instance._id });
        expect(journeys.length).toBe(1);

        const journals = await FinancialJournal.find({ referenceType: 'ESCROW_HOLD_DIGITAL' });
        expect(journals.length).toBe(1);

        const updatedInstance = await TripInstance.findById(instance._id);
        expect(updatedInstance.segmentCapacity[0].seatsOccupied).toBe(1);
    });

    test('18. security: OTP is 4 digits and never exposed to the driver', async () => {
        const { passenger, instance, offer } = await createTestFixtures({ fare: 40 });

        const assignment = await OfferAcceptanceEngine.acceptOfferAtomic(offer._id, passenger._id);

        // Verify assignment object does NOT have otp exposed directly on driver properties
        expect(assignment.otp).toBeUndefined();

        const journey = await PassengerJourney.findOne({ tripInstanceId: instance._id });
        expect(journey.verificationOtp).toBeDefined();
        expect(journey.verificationOtp).toMatch(/^[0-9]{4}$/);
    });
});
