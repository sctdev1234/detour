const axios = require('axios');
const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

const API_URL = 'http://localhost:5001/api';

const testLifecycle = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // 1. Login Driver
        const driverLogin = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'driver_test@example.com', password: 'password123' })
        });
        const driverData = await driverLogin.json();
        const driverToken = driverData.token;
        console.log('Driver logged in');

        // 2. Login Client
        const clientLogin = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'client_test@example.com', password: 'password123' })
        });
        let clientData = await clientLogin.json();

        if (clientData.msg === 'Invalid Credentials') {
            console.log('Client not found, registering...');
            const registerRes = await fetch(`${API_URL}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: 'Client Test',
                    email: 'client_test@example.com',
                    password: 'password123',
                    role: 'client'
                })
            });
            clientData = await registerRes.json();
        }

        console.log('Client Login Response:', JSON.stringify(clientData, null, 2));
        const clientToken = clientData.token;
        console.log('Client logged in');

        // 3. Driver Creates Route
        console.log('Creating Driver Route...');
        const routeRes = await fetch(`${API_URL}/trip/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': driverToken },
            body: JSON.stringify({
                role: 'driver',
                startPoint: { latitude: 33.5731, longitude: -7.5898, address: 'Casablanca' },
                endPoint: { latitude: 34.0209, longitude: -6.8416, address: 'Rabat' },
                days: ['Monday'],
                timeStart: '09:00',
                timeArrival: '10:00',
                price: 50
            })
        });
        const driverRoute = await routeRes.json();
        console.log('Driver Route Created:', driverRoute._id);

        // 4. Client Creates Route (Search Criteria)
        console.log('Creating Client Route...');
        const clientRouteRes = await fetch(`${API_URL}/trip/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-auth-token': clientToken },
            body: JSON.stringify({
                role: 'client',
                startPoint: { latitude: 33.5731, longitude: -7.5898, address: 'Casablanca' },
                endPoint: { latitude: 34.0209, longitude: -6.8416, address: 'Rabat' },
                days: ['Monday'],
                timeStart: '09:00',
                timeArrival: '10:00'
            })
        });
        const clientRoute = await clientRouteRes.json();
        console.log('Client Route Response:', JSON.stringify(clientRoute, null, 2));
        console.log('Client Route Created:', clientRoute._id);

        // 5. Search Matches
        console.log('Searching matches...');
        const matchRes = await fetch(`${API_URL}/trip/matches/${clientRoute._id}`, {
            headers: { 'x-auth-token': clientToken }
        });
        const matches = await matchRes.json();

        if (matches.length > 0) {
            const match = matches[0];
            const tripId = match.trip._id;
            console.log('Match found, Trip ID:', tripId);

            // 6. Join Request
            console.log('Sending Join Request...');
            const joinRes = await fetch(`${API_URL}/trip/request-join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': clientToken },
                body: JSON.stringify({
                    clientRouteId: clientRoute._id,
                    tripId: tripId
                })
            });
            const joinRequest = await joinRes.json();
            console.log('Join Request Sent:', joinRequest._id);

            // 7. Driver Accepts
            console.log('Driver Accepting Request...');
            await fetch(`${API_URL}/trip/handle-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': driverToken },
                body: JSON.stringify({
                    requestId: joinRequest._id,
                    status: 'accepted'
                })
            });
            console.log('Request Accepted');

            // 8. Start Trip
            console.log('Starting Trip...');
            const startRes = await fetch(`${API_URL}/trip/${tripId}/start`, {
                method: 'PATCH',
                headers: { 'x-auth-token': driverToken }
            });
            const activeTrip = await startRes.json();
            console.log('Trip Status (should be active):', activeTrip.status);

            if (activeTrip.status !== 'active') throw new Error('Trip failed to start');

            // 9. Complete Trip
            console.log('Completing Trip...');
            const completeRes = await fetch(`${API_URL}/trip/${tripId}/complete`, {
                method: 'PATCH',
                headers: { 'x-auth-token': driverToken }
            });
            const completedTrip = await completeRes.json();
            console.log('Trip Status (should be completed):', completedTrip.status);

            if (completedTrip.status !== 'completed') throw new Error('Trip failed to complete');

            console.log('SUCCESS: Full Trip Lifecycle Verified!');

        } else {
            console.log('No matches found.');
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

testLifecycle();
