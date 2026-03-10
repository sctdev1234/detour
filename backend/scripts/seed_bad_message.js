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
const Reclamation = require('../models/Reclamation');

async function seedBadMessage() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find a client and a driver
        const client = await User.findOne({ role: 'client' });
        const driver = await User.findOne({ role: 'driver' });

        if (!client || !driver) {
            console.log("Could not find a client and driver.");
            process.exit(1);
        }

        // Check if there is already a chat between them, otherwise create one or just find *any* chat
        let chat = await Chat.findOne({ participants: { $all: [client._id, driver._id] } });

        if (!chat) {
            chat = await Chat.findOne(); // fallback to any chat
            if (!chat) {
                console.log("No chats exist. Please run seed_chats.js first.");
                process.exit(1);
            }
        }

        // Add a "bad" message
        console.log("Adding a bad message to the chat...");
        const badText = "You are a terrible driver, I'm never using this awful service again! **** you!";
        chat.messages.push({
            senderId: client._id,
            text: badText
        });

        await chat.save();

        // Grab the message we just inserted
        const badMessage = chat.messages[chat.messages.length - 1];

        // Create a report for it from the driver's perspective
        console.log(`Creating a ticket reporting message ID: ${badMessage._id}`);
        const report = new Reclamation({
            reporterId: driver._id,
            chatId: chat._id,
            reportedMessageId: badMessage._id,
            type: 'behaving',
            subject: 'Client was extremely abusive',
            description: `The client swore at me and insulted my driving for no reason. Please see the chat log for the message: "${badText}"`,
            status: 'pending'
        });

        await report.save();

        console.log(`Successfully added a bad message and created a reported ticket (Ticket ID: ${report._id})!`);
        process.exit(0);
    } catch (err) {
        console.error('Error seeding bad message:', err);
        process.exit(1);
    }
}

seedBadMessage();
