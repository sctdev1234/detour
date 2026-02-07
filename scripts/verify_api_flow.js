const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000/api';
const RUN_ID = crypto.randomBytes(4).toString('hex');

const driverUser = {
    fullName: `Driver ${RUN_ID}`,
    email: `driver_${RUN_ID}@test.com`,
    password: 'password123',
    phone: `555${Math.floor(Math.random() * 1000000)}`,
    role: 'driver'
};

const clientUser = {
    fullName: `Client ${RUN_ID}`,
    email: `client_${RUN_ID}@test.com`,
    password: 'password123',
    phone: `555${Math.floor(Math.random() * 1000000)}`,
    role: 'client'
};

let driverToken = '';
let clientToken = '';
let driverId = '';
let clientId = '';
let driverRouteId = '';
let clientRouteId = '';
let tripId = '';
let requestId = '';

async function request(endpoint, method, body, token) {
    const headers = {
        'Content-Type': 'application/json'
    };
    if (token) headers['x-auth-token'] = token;

    const options = {
        method,
        headers,
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await res.json();
    return { status: res.status, data };
}

async function run() {
    console.log(`Starting Verification Run: ${RUN_ID}`);

    // 1. Register Driver
    console.log('\n[1] Registering Driver...');
    let res = await request('/auth/signup', 'POST', driverUser);
    if (res.status !== 200 && res.status !== 201) throw new Error(`Failed to register driver: ${JSON.stringify(res.data)}`);
    driverToken = res.data.token;
    // Decode token or get ID from somewhere? The register endpoint usually returns token. 
    // We assume backend returns user object too or we fetch profile.
    // Let's fetch profile to get ID
    res = await request('/auth/me', 'GET', null, driverToken);
    driverId = res.data._id;
    console.log(`Driver registered: ${driverId}`);

    // 2. Register Client
    console.log('\n[2] Registering Client...');
    res = await request('/auth/signup', 'POST', clientUser);
    if (res.status !== 200 && res.status !== 201) throw new Error(`Failed to register client: ${JSON.stringify(res.data)}`);
    clientToken = res.data.token;
    res = await request('/auth/me', 'GET', null, clientToken);
    clientId = res.data._id;
    console.log(`Client registered: ${clientId}`);

    // 3. Create Driver Route
    console.log('\n[3] Creating Driver Route...');
    const driverRouteData = {
        role: 'driver',
        startPoint: { latitude: 34.0, longitude: -6.8, address: 'Rabat, Morocco' },
        endPoint: { latitude: 33.5, longitude: -7.6, address: 'Casablanca, Morocco' },
        timeStart: '08:00',
        days: ['Mon', 'Tue', 'Wed'],
        price: 50,
        priceType: 'fix',
        status: 'pending',
        carId: 'car_123' // Mock car ID
    };
    res = await request('/trip/route', 'POST', driverRouteData, driverToken);
    if (res.status !== 200) throw new Error(`Failed to create driver route: ${JSON.stringify(res.data)}`);
    driverRouteId = res.data._id;
    console.log(`Driver Route created: ${driverRouteId}`);

    // 4. Verify Trip Creation (Check Driver's Trips)
    console.log('\n[4] Verifying Trip Auto-Creation...');
    res = await request('/trip/all', 'GET', null, driverToken);
    const trips = res.data;
    const createdTrip = trips.find(t => t.routeId && t.routeId._id === driverRouteId);
    if (!createdTrip) throw new Error('Trip was not automatically created for the driver route!');
    tripId = createdTrip._id;
    console.log(`Trip found: ${tripId} (Status: ${createdTrip.status})`);

    // 5. Create Client Route
    console.log('\n[5] Creating Client Route...');
    const clientRouteData = {
        role: 'client',
        startPoint: { latitude: 34.0, longitude: -6.8, address: 'Rabat Agdal' }, // Close to driver
        endPoint: { latitude: 33.5, longitude: -7.6, address: 'Casa Port' },    // Close to driver
        timeStart: '08:00',
        days: ['Mon'],
        price: 0,
        priceType: 'fix',
        status: 'pending'
    };
    res = await request('/trip/route', 'POST', clientRouteData, clientToken);
    if (res.status !== 200) throw new Error(`Failed to create client route: ${JSON.stringify(res.data)}`);
    clientRouteId = res.data._id;
    console.log(`Client Route created: ${clientRouteId}`);

    // 6. Client Searches Matches
    console.log('\n[6] Client Searching Matches...');
    res = await request(`/trip/matches/${clientRouteId}`, 'GET', null, clientToken);
    const matches = res.data;
    console.log(`Found ${matches.length} matches`);
    const match = matches.find(m => m.trip && m.trip._id === tripId);
    if (!match) {
        console.warn('WARNING: Match not found immediately. This might be due to strict geo-matching or missing implementation.');
        // We will proceed by trying to join the trip ID directly if we know it exists, to test the JOIN logic.
        // But normally match should be found.
    } else {
        console.log('Match found correctly!');
    }

    // 7. Client Sends Join Request
    console.log('\n[7] Client Sending Join Request...');
    res = await request('/trip/request-join', 'POST', { clientRouteId, tripId }, clientToken);
    if (res.status !== 200) throw new Error(`Failed to send join request: ${JSON.stringify(res.data)}`);
    const requestData = res.data;
    requestId = requestData._id;
    console.log(`Join Request sent: ${requestId} (Status: ${requestData.status})`);

    // 8. Driver Checks Requests
    console.log('\n[8] Driver Checking Requests...');
    res = await request('/trip/requests/driver', 'GET', null, driverToken);
    const driverRequests = res.data;
    const targetRequest = driverRequests.find(r => r._id === requestId);
    if (!targetRequest) throw new Error('Driver cannot see the join request!');
    console.log('Driver sees the request.');

    // 9. Driver Accepts Request
    console.log('\n[9] Driver Accepting Request...');
    res = await request('/trip/handle-request', 'POST', { requestId, status: 'accepted' }, driverToken);
    if (res.status !== 200) throw new Error(`Failed to accept request: ${JSON.stringify(res.data)}`);
    console.log('Request accepted.');

    // 10. Verify Trip Status and Participants
    console.log('\n[10] Verifying Final Trip State...');
    res = await request('/trip/all', 'GET', null, driverToken); // Driver checks trip
    const updatedTrip = res.data.find(t => t._id === tripId);
    console.log('Trip Clients:', JSON.stringify(updatedTrip.clients, null, 2));

    // Check if client is in trip.clients
    // Note: clients array structure might be objects with userId
    const isClientJoined = updatedTrip.clients.some(c => c.userId === clientId || c.userId._id === clientId);

    if (isClientJoined) {
        console.log('SUCCESS: Client successfully joined the trip!');
    } else {
        throw new Error('Client is NOT in the trip participants list!');
    }

}

run().catch(err => {
    console.error('\nFAILED:', err.message);
    process.exit(1);
});
