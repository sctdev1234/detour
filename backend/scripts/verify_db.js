const mongoose = require('mongoose');
const User = require('../models/User');
const Route = require('../models/Route');
const Trip = require('../models/Trip');
const Car = require('../models/Car');

require('dotenv').config(); // Load from .env in current directory

const verify = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check Driver
        const driver = await User.findOne({ email: 'driver_test@example.com' });
        if (!driver) {
            console.log('Driver not found');
            return;
        }
        console.log(`\nDriver Found: ${driver.fullName} (${driver._id})`);

        // Check Driver Routes
        const routes = await Route.find({ userId: driver._id });
        console.log(`\n--- Driver Routes (${routes.length}) ---`);
        routes.forEach(r => {
            console.log(`Route ID: ${r._id}`);
            console.log(`  Start: ${r.startPoint.address} (${r.startPoint.coordinates})`);
            console.log(`  End: ${r.endPoint.address} (${r.endPoint.coordinates})`);
            console.log(`  Schedule: ${JSON.stringify(r.schedule)}`);
            console.log(`  Role: ${r.role}`);
            console.log(`  Status: ${r.status}`);
        });

        // Check Trips for these routes
        const routeIds = routes.map(r => r._id);
        const trips = await Trip.find({ routeId: { $in: routeIds } });
        console.log(`\n--- Driver Trips (${trips.length}) ---`);
        trips.forEach(t => {
            console.log(`Trip ID: ${t._id}`);
            console.log(`  Route ID: ${t.routeId}`);
            console.log(`  Date: ${t.date}`);
            console.log(`  Status: ${t.status}`);
            console.log(`  Seats Available: ${t.seatsAvailable}`);
        });

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

verify();
