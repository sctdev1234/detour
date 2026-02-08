const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const PORT = process.env.PORT || 5000;
const API_URL = `http://localhost:${PORT}/api`;

const reproduce = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected.');

        const driver = await User.findOne({ email: 'driver_test@example.com' });

        if (!driver) {
            console.error('Driver not found');
            return;
        }

        const token = jwt.sign({ user: { id: driver.id, role: driver.role } }, process.env.JWT_SECRET, { expiresIn: 360000 });
        console.log('Generated Token for driver:', driver.email);

        const routeData = {
            role: 'driver',
            carId: 'dummy_car_id',
            startPoint: { latitude: 33.5731, longitude: -7.5898, address: 'Casablanca' },
            endPoint: { latitude: 34.0209, longitude: -6.8416, address: 'Rabat' },
            waypoints: [],
            timeStart: '10:00',
            timeArrival: '11:00',
            days: ['Monday'],
            price: 50,
            priceType: 'fix',
            distanceKm: 90,
            estimatedDurationMin: 60,
            routeGeometry: 'encoded_polyline'
        };

        console.log('Sending request to', `${API_URL}/trip/route`);

        const response = await fetch(`${API_URL}/trip/route`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-auth-token': token
            },
            body: JSON.stringify(routeData)
        });

        const data = await response.json();
        console.log('Response Data:', data);

        if (response.ok) {
            const createdRoute = data;
            console.log('Driver Route Created:', createdRoute._id);

            // Now simulate Client Search
            // 1. Create a dummy client route (search criteria)
            const clientRouteData = {
                role: 'client',
                startPoint: routeData.startPoint, // Exact same points for easy match
                endPoint: routeData.endPoint,
                timeStart: '10:00', // Same time
                timeArrival: '11:00',
                days: ['Monday'],
                price: 0,
                priceType: 'fix'
            };

            // We need a client token. Let's assume we can just use the driver token for now (if logic allows) 
            // or find a client user.
            const client = await User.findOne({ role: 'client' });
            let clientToken = token;
            if (client) {
                clientToken = jwt.sign({ user: { id: client.id, role: client.role } }, process.env.JWT_SECRET, { expiresIn: 360000 });
                console.log('Using Client Token for:', client.email);
            } else {
                console.log('No client found, using driver token (might fail if role restricted)');
            }

            // Create client route to trigger matching
            console.log('Creating Client Route for Search...');
            const clientRes = await fetch(`${API_URL}/trip/route`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': clientToken },
                body: JSON.stringify(clientRouteData)
            });
            const clientRoute = await clientRes.json();
            console.log('Client Route Created:', clientRoute._id);

            // Search Matches
            console.log('Searching Matches for Client Route:', clientRoute._id);
            const matchRes = await fetch(`${API_URL}/trip/matches/${clientRoute._id}`, {
                headers: { 'x-auth-token': clientToken }
            });
            const matches = await matchRes.json();
            console.log('Matches Found:', matches.length);
            if (matches.length > 0) {
                console.log('First Match:', JSON.stringify(matches[0], null, 2));

                const match = matches[0];
                const tripId = match.trip._id;
                console.log('Client sending Join Request for Trip:', tripId);

                // Send Join Request
                const joinRes = await fetch(`${API_URL}/trip/request-join`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': clientToken },
                    body: JSON.stringify({
                        clientRouteId: clientRoute._id,
                        tripId: tripId
                    })
                });
                const joinRequest = await joinRes.json();
                console.log('Join Request Created:', joinRequest);

                // Driver Accepts Request
                console.log('Driver accepting request...');
                const actionRes = await fetch(`${API_URL}/trip/handle-request`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-auth-token': token }, // Driver token
                    body: JSON.stringify({
                        requestId: joinRequest._id,
                        status: 'accepted'
                    })
                });
                const updatedRequest = await actionRes.json();
                console.log('Request Status after Accept:', updatedRequest.status);

                // Verify Trip Status
                // We need to fetch the trip again or check DB
                // Let's use fetch for consistency
                const tripRes = await fetch(`${API_URL}/trip/all`, { // This returns all trips for user
                    headers: { 'x-auth-token': token }
                });
                // Actually getTrips returns trips where user is driver OR client. 
                const allTrips = await tripRes.json();
                const myTrip = allTrips.find(t => t._id === tripId);
                console.log('Trip Status Final:', myTrip ? myTrip.status : 'Trip not found in list');
                console.log('Trip Clients:', myTrip ? JSON.stringify(myTrip.clients) : 'N/A');
            } else {
                console.log('No matches found. Check geospatial query or schedule.');
            }
        }

    } catch (err) {
        console.error('Script Error:', err);
    } finally {
        await mongoose.disconnect();
    }
};

reproduce();
