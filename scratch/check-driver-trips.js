const mongoose = require('mongoose');
const URI = 'mongodb+srv://sct:sct.123@lamp.add7ofy.mongodb.net/detour?retryWrites=true&w=majority&appName=lamp';

async function run() {
    await mongoose.connect(URI);
    console.log('Connected to MongoDB');
    
    // Find all driver users
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const drivers = await User.find({ role: 'driver' });
    console.log('Drivers list:', drivers.map(d => ({ id: d._id, email: d.email, fullName: d.fullName, driverStatus: d.driverStatus })));
    
    const Trip = mongoose.model('Trip', new mongoose.Schema({}, { strict: false }), 'trips');
    const allTrips = await Trip.find({}).sort({ createdAt: -1 });
    console.log('Total Trip documents:', allTrips.length);
    
    allTrips.forEach(t => {
        console.log({
            id: t._id,
            driverId: t.driverId,
            status: t.status,
            createdAt: t.createdAt
        });
    });
    
    // Let's also check active trip query for each driver
    for (const driver of drivers) {
        console.log(`\nChecking active trips for driver: ${driver.email} (${driver._id})`);
        const activeTrip = await Trip.findOne({ 
            driverId: driver._id, 
            status: { $nin: ['COMPLETED', 'RIDE_COMPLETED', 'CANCELLED', 'ARCHIVED'] } 
        });
        console.log('Active Trip found:', activeTrip ? { id: activeTrip._id, status: activeTrip.status } : 'NONE');
    }
    
    await mongoose.disconnect();
}

run().catch(console.error);
