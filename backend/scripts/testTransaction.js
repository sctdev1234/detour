const mongoose = require('mongoose');
const User = require('../models/User');
const Trip = require('../models/Trip');
const Route = require('../models/Route');
const Transaction = require('../models/Transaction');
const tripService = require('../services/tripService');
const transactionService = require('../services/transactionService');
const dotenv = require('dotenv');

dotenv.config({ path: 'backend/.env' }); // Adjust path if needed

async function testTransaction() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        // Cleanup
        await User.deleteMany({ email: { $in: ['testclient@example.com', 'testdriver@example.com'] } });
        await Route.deleteMany({ 'startPoint.address': 'Test Start' });
        // Clean related trips/transactions manually if needed, or just rely on new IDs

        // 1. Create Users
        const client = await User.create({
            email: 'testclient@example.com',
            password: 'password123',
            fullName: 'Test Client',
            role: 'client',
            balance: 100 // ample balance
        });

        const driver = await User.create({
            email: 'testdriver@example.com',
            password: 'password123',
            fullName: 'Test Driver',
            role: 'driver',
            balance: 0
        });

        console.log('Users created:', { client: client._id, driver: driver._id });

        // 2. Create Driver Route & Trip
        const routeData = {
            role: 'driver',
            startPoint: { latitude: 34, longitude: -6, address: 'Test Start' },
            endPoint: { latitude: 35, longitude: -5, address: 'Test End' },
            price: 50,
            days: ['Monday']
        };

        const scheduledRoute = await tripService.createRoute(driver._id, routeData);
        // Trip is auto-created
        const trip = await Trip.findOne({ routeId: scheduledRoute._id });
        console.log('Trip created:', trip._id);

        // 3. Client Joins (Simulate)
        // Manually add client to trip for speed, skipping join request flow
        trip.clients.push({
            userId: client._id,
            status: 'pending',
            paymentStatus: 'pending'
        });
        await trip.save();
        console.log('Client added to trip');

        // 4. Confirm Pickup (Triggers Payment)
        console.log('Confirming Pickup...');
        const updatedTrip = await tripService.confirmPickup(driver._id.toString(), {
            tripId: trip._id.toString(),
            clientId: client._id.toString()
        });

        console.log('Pickup Confirmed. Client Status:', updatedTrip.clients[0].status);
        console.log('Client Payment Status:', updatedTrip.clients[0].paymentStatus);

        // 5. Verify Balances
        const updatedClient = await User.findById(client._id);
        const updatedDriver = await User.findById(driver._id);

        console.log('Client Balance (Expected 50):', updatedClient.balance);
        console.log('Driver Balance (Expected 0 + 50 - 5 = 45):', updatedDriver.balance);
        console.log('Client Spending Total:', updatedClient.spending.total);
        console.log('Driver Earnings Total:', updatedDriver.earnings.total);

        // 6. Verify Transactions
        const transactions = await Transaction.find({ tripId: trip._id });
        console.log('Transactions found:', transactions.length);
        transactions.forEach(t => {
            console.log(`- ${t.type} ${t.amount} (${t.description}) for ${t.userId}`);
        });

    } catch (err) {
        console.error('Test Failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

testTransaction();
