const mongoose = require('mongoose');
const path = require('path');

// Try to load .env
const rootEnvPath = path.join(__dirname, '..', '.env');
if (require('fs').existsSync(rootEnvPath)) {
    require('dotenv').config({ path: rootEnvPath });
} else {
    require('dotenv').config();
}

const User = require('../models/User');
const Chat = require('../models/Chat');
const JoinRequest = require('../models/JoinRequest');

async function seedChats() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find some users to use as mock participants
        const clients = await User.find({ role: 'client' }).limit(2);
        const drivers = await User.find({ role: 'driver' }).limit(2);

        if (clients.length === 0 || drivers.length === 0) {
            console.log('Not enough clients or drivers found in the database. Please ensure you have at least 1 client and 1 driver.');
            process.exit(1);
        }

        console.log(`Found clients: ${clients.map(c => c.fullName || c.email).join(', ')}`);
        console.log(`Found drivers: ${drivers.map(d => d.fullName || d.email).join(', ')}`);

        // We need a JoinRequest since Chat requires a requestId
        // We'll just create a mock one or find an existing one
        let request1 = await JoinRequest.findOne();
        if (!request1) {
            // Create a dummy join request if none exists
            // JoinRequest requires user, car, date... we'll just mock basic fields if model allows,
            // or we bypass validation. For safety, let's create a minimal valid one if possible,
            // or just create a new ObjectId if it's only a ref.
            console.log("No JoinRequest found. Creating a dummy one just for reference.");
            request1 = new JoinRequest({
                user: clients[0]._id,
                // Some models require strict fields, let's see if we can get away with just creating it.
                // Alternatively we can just use a random ObjectId, but it might fail population.
            });
            // we'll skip saving the request if it fails and just use a fake ObjectId, 
            // but it's better if we have a real one or just an ObjectId.
            // We'll use a random ObjectId if it doesn't exist.
        }

        const mockRequestId1 = request1 ? request1._id : new mongoose.Types.ObjectId();
        const mockRequestId2 = new mongoose.Types.ObjectId();

        console.log("Seeding chat 1...");
        // Chat 1: Client 0 and Driver 0
        const chat1 = new Chat({
            requestId: mockRequestId1,
            participants: [clients[0]._id, drivers[0]._id],
            messages: [
                { senderId: clients[0]._id, text: 'Hello, are you available for a ride today at 5 PM?' },
                { senderId: drivers[0]._id, text: 'Hi! Yes, I am available. Where are you heading?' },
                { senderId: clients[0]._id, text: 'Going to the downtown mall.' },
                { senderId: drivers[0]._id, text: 'Perfect. I can pick you up.' }
            ]
        });
        await chat1.save();

        console.log("Seeding chat 2...");
        // Chat 2: Client 1 (or 0 if only 1 exists) and Driver 1 (or 0)
        const chat2 = new Chat({
            requestId: mockRequestId2,
            participants: [clients[1] ? clients[1]._id : clients[0]._id, drivers[1] ? drivers[1]._id : drivers[0]._id],
            messages: [
                { senderId: clients[1] ? clients[1]._id : clients[0]._id, text: 'I need to transport some boxes.' },
                { senderId: drivers[1] ? drivers[1]._id : drivers[0]._id, text: 'What kind of car do you need?' },
                { senderId: clients[1] ? clients[1]._id : clients[0]._id, text: 'A small van should be enough.' }
            ]
        });
        await chat2.save();

        console.log('Successfully seeded 2 mock chats!');
        process.exit(0);

    } catch (err) {
        console.error('Error seeding data:', err);
        process.exit(1);
    }
}

seedChats();
