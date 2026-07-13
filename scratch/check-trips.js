const mongoose = require('mongoose');
const URI = 'mongodb+srv://sct:sct.123@lamp.add7ofy.mongodb.net/detour?retryWrites=true&w=majority&appName=lamp';

async function run() {
    await mongoose.connect(URI);
    console.log('Connected to MongoDB');
    
    // Find all client users
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }), 'users');
    const users = await User.find({ role: 'client' });
    console.log('Clients count:', users.length);
    console.log('Clients list:', users.map(u => ({ id: u._id, email: u.email, fullName: u.fullName })));
    
    const TripInstance = mongoose.model('TripInstance', new mongoose.Schema({}, { strict: false }), 'tripinstances');
    const trips = await TripInstance.find({}).sort({ createdAt: -1 });
    console.log('Total trips:', trips.length);
    
    console.log('Last 10 trips:');
    trips.slice(0, 10).forEach(t => {
        console.log({
            id: t._id,
            passengerIds: t.passengerIds,
            status: t.status,
            createdAt: t.createdAt
        });
    });
    
    await mongoose.disconnect();
}

run().catch(console.error);
