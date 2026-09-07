const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const DispatchServiceV2 = require('../services/v2/dispatchService');
const TripInstance = require('../models/TripInstance');
const Offer = require('../models/Offer');
const TripAssignment = require('../models/TripAssignment');
const User = require('../models/User');

let mongoServer;

beforeAll(async () => {
    // We use a ReplSet to support MongoDB Transactions
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    await TripInstance.createCollection();
    await Offer.createCollection();
    await TripAssignment.createCollection();
    await User.createCollection();
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
    await User.deleteMany({});
});

describe('DispatchServiceV2 Concurrency', () => {
    it('should handle concurrent offer acceptances idempotently and atomicly', async () => {
        // Setup passenger & driver
        const passenger = new User({
            fullName: 'Test Passenger',
            email: 'concur_p@test.com',
            password: 'hash',
            role: 'client',
            walletBalance: 100,
            heldBalance: 0
        });
        await passenger.save();

        const driver = new User({
            fullName: 'Test Driver',
            email: 'concur_d@test.com',
            password: 'hash',
            role: 'driver',
            walletBalance: 200,
            driverStatus: 'ONLINE'
        });
        await driver.save();

        // Setup mock instance and offer
        const instance = new TripInstance({
            templateId: new mongoose.Types.ObjectId(),
            passengerIds: [passenger._id],
            pickup: { type: 'Point', coordinates: [0, 0], address: 'Pickup Address' },
            destination: { type: 'Point', coordinates: [1, 1], address: 'Destination Address' },
            scheduledTime: new Date(),
            status: 'OFFERS_OPEN'
        });
        await instance.save();

        const offer = new Offer({
            tripInstanceId: instance._id,
            driverId: driver._id,
            passengerId: passenger._id,
            price: 10,
            status: 'PENDING',
            expiresAt: new Date(Date.now() + 60000)
        });
        await offer.save();

        // Simulate 3 concurrent API calls accepting the same offer
        const acceptancePromises = [
            DispatchServiceV2.acceptOffer(offer._id),
            DispatchServiceV2.acceptOffer(offer._id),
            DispatchServiceV2.acceptOffer(offer._id)
        ];

        const results = await Promise.allSettled(acceptancePromises);
        
        // Assertions
        const successful = results.filter(r => r.status === 'fulfilled');
        
        // Either they all succeed (due to idempotency returning the existing assignment)
        // or one succeeds and others fail. With our idempotency guard, they should all succeed
        // and return the EXACT same assignment ID.
        expect(successful.length).toBeGreaterThan(0);
        
        if (successful.length > 1) {
            const firstId = successful[0].value._id.toString();
            successful.forEach(res => {
                expect(res.value._id.toString()).toBe(firstId);
            });
        }

        // Verify state is correct in DB
        const dbOffer = await Offer.findById(offer._id);
        expect(dbOffer.status).toBe('ACCEPTED');

        const dbInstance = await TripInstance.findById(instance._id);
        expect(dbInstance.status).toBe('ASSIGNED');
        expect(dbInstance.assignmentId).toBeDefined();

        const assignmentCount = await TripAssignment.countDocuments({ tripInstanceId: instance._id });
        expect(assignmentCount).toBe(1); // Only ONE assignment created
    });
});
