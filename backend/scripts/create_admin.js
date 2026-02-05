const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load environment variables
const rootEnvPath = path.join(__dirname, '..', '.env');
require('dotenv').config({ path: rootEnvPath });

const User = require('../models/User');

const createAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');

        const email = 'admin@detour.com';
        const password = 'admin'; // Simple password for initial access
        const fullName = 'System Admin';

        // Check if exists
        let user = await User.findOne({ email });
        if (user) {
            console.log('Admin user already exists. Updating role to be sure.');
            user.role = 'admin';
            user.password = await bcrypt.hash(password, 10); // Reset password just in case
            await user.save();
            console.log('Admin updated.');
        } else {
            // Create new
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            user = new User({
                email,
                password: hashedPassword,
                fullName,
                role: 'admin',
                verificationStatus: 'verified'
            });

            await user.save();
            console.log('Admin user created successfully.');
        }

        console.log('-----------------------------------');
        console.log('Email: ' + email);
        console.log('Password: ' + password);
        console.log('-----------------------------------');

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

createAdmin();
