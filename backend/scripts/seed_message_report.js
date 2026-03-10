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

async function seedMessageReport() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Find a chat with messages
        const chat = await Chat.findOne({ 'messages.0': { $exists: true } });

        if (!chat) {
            console.log("No chats with messages found. Run the seed_chats script first.");
            process.exit(1);
        }

        // Get the first message and its sender
        const offendingMessage = chat.messages[0];
        const reporterId = chat.participants.find(p => p.toString() !== offendingMessage.senderId.toString());

        if (!reporterId) {
            console.log("Could not determine reporter.");
            process.exit(1);
        }

        console.log(`Creating test report for message ID ${offendingMessage._id} in chat ${chat._id}...`);

        const newReclamation = new Reclamation({
            reporterId: reporterId, // The other participant is reporting
            chatId: chat._id,
            reportedMessageId: offendingMessage._id,
            type: 'behaving',
            subject: 'Inappropriate language in chat',
            description: `I am reporting this user because they were rude in the chat. They said: "${offendingMessage.text}"`,
            status: 'pending' // default
        });

        await newReclamation.save();
        console.log(`Successfully created reclamation: ${newReclamation._id}`);

        process.exit(0);
    } catch (err) {
        console.error('Error creating report:', err);
        process.exit(1);
    }
}

seedMessageReport();
