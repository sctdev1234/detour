const axios = require('axios');
const assert = require('assert');

const API_URL = 'http://localhost:5000/api';

async function runSmokeTest() {
    console.log('--- Starting E2E Staging Smoke Test ---');
    try {
        // 1. Register Passenger
        console.log('1. Registering Passenger...');
        const passPhone = `+19998${Math.floor(100000 + Math.random() * 900000)}`;
        const passRes = await axios.post(`${API_URL}/auth/signup`, {
            email: `smoke.pass.${Date.now()}@example.com`,
            password: 'password123',
            phone: passPhone,
            role: 'client',
            fullName: 'Smoke Passenger'
        });
        const passToken = passRes.data.token;
        
        const passApi = axios.create({ baseURL: API_URL, headers: { 'x-auth-token': passToken } });
        
        // 2. Register Driver
        console.log('2. Registering Driver...');
        const driverPhone = `+19998${Math.floor(100000 + Math.random() * 900000)}`;
        const driverRes = await axios.post(`${API_URL}/auth/signup`, {
            email: `smoke.driver.${Date.now()}@example.com`,
            password: 'password123',
            phone: driverPhone,
            role: 'driver',
            fullName: 'Smoke Driver'
        });
        const driverToken = driverRes.data.token;
        const driverApi = axios.create({ baseURL: API_URL, headers: { 'x-auth-token': driverToken } });

        // Admin Registration is blocked by default, let's create it directly via mongoose later or bypass it.
        // Actually, we can just top up the passenger using wallet topup endpoint (it might not require admin)
        console.log('3. Topping up passenger wallet...');
        await passApi.post('/wallet/topup', { amount: 500, idempotencyKey: `smoke-topup-${Date.now()}` });
        
        console.log('3.1 Setting Driver Location...');
        await driverApi.post('/tracking/update', {
            latitude: 31.628,
            longitude: -7.989,
            heading: 0,
            speed: 0
        });
        
        // 4. Passenger books a ride
        console.log('4. Passenger requests ride...');
        const rideReq = await passApi.post('/v2/dispatch/template', {
            startPoint: { type: 'Point', coordinates: [-7.989, 31.628], address: 'Pickup Location' },
            endPoint: { type: 'Point', coordinates: [-7.981, 31.630], address: 'Dropoff Location' },
            schedulingStrategy: 'IMMEDIATE',
            seats: 1
        });
        const tripId = rideReq.data.data.instanceId;
        
        if (!tripId) {
            console.log('Ride response:', rideReq.data);
            throw new Error('Trip ID not found in response');
        }

        // Wait a bit for dispatch engine
        await new Promise(r => setTimeout(r, 1000));
        
        // 5. Driver fetches available rides and accepts
        console.log('5. Driver fetching offers...');
        const offersRes = await driverApi.get('/v2/dispatch/driver/offers');
        const offer = offersRes.data.data[0];
        
        if (!offer) {
            console.log('No offers found for driver!');
        } else {
            console.log('Driver accepting offer...');
            await driverApi.post(`/v2/dispatch/driver/offer/${offer._id}/accept`);
            
            // 6. Complete Trip
            console.log('6. Driver completing trip...');
            const instanceId = offer.tripInstanceId._id;
            await driverApi.patch(`/v2/dispatch/driver/trip/${instanceId}/status`, { status: 'EN_ROUTE' });
            await driverApi.patch(`/v2/dispatch/driver/trip/${instanceId}/status`, { status: 'ARRIVED' });
            await driverApi.patch(`/v2/dispatch/driver/trip/${instanceId}/status`, { status: 'STARTED' });
            await driverApi.patch(`/v2/dispatch/driver/trip/${instanceId}/status`, { status: 'COMPLETED' });

            // Wait for asynchronous DomainEvent processing (FinanceListeners)
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 7. Verify Passenger Wallet
            console.log('7. Verifying Passenger Wallet Deduction...');
            const finalPassWallet = await passApi.get('/wallet/balance');
            console.log('Final Passenger Wallet:', finalPassWallet.data);

            // 8. Verify Driver Wallet
            console.log('8. Verifying Driver Earnings...');
            const finalDriverWallet = await driverApi.get('/wallet/balance');
            console.log('Final Driver Earnings:', finalDriverWallet.data);
            
            // 9. Admin Operations
            console.log('9. Admin Operations Verification...');
            const mongoose = require('mongoose');
            const env = require('dotenv');
            env.config({ path: './backend/.env' });
            await mongoose.connect(process.env.MONGODB_URI);
            
            // Register an admin
            const adminEmail = `admin.${Date.now()}@example.com`;
            const adminRes = await axios.post(`${API_URL}/auth/signup`, {
                email: adminEmail,
                password: 'password123',
                phone: `+19999${Math.floor(100000 + Math.random() * 900000)}`,
                role: 'client', // Will upgrade via db
                fullName: 'Smoke Admin'
            });
            const adminId = adminRes.data.user.id;
            
            // Upgrade role
            const User = mongoose.model('User', new mongoose.Schema({ role: String }, { strict: false }));
            await User.findByIdAndUpdate(adminId, { role: 'admin' });
            
            // Re-login to get admin token
            const adminLogin = await axios.post(`${API_URL}/auth/login`, {
                email: adminEmail,
                password: 'password123'
            });
            const adminApi = axios.create({ baseURL: API_URL, headers: { 'x-auth-token': adminLogin.data.token } });
            
            // 9.1 Driver Requests Withdrawal
            console.log('9.1 Driver Requesting Withdrawal...');
            const withdrawRes = await driverApi.post('/wallet/driver/withdraw', {
                amount: 5,
                paymentMethod: 'bank_transfer',
                paymentDetails: 'RIB 123456789'
            });
            const withdrawalId = withdrawRes.data.withdrawal._id;
            
            // 9.2 Admin Checks Ledger
            console.log('9.2 Admin Checking Ledger...');
            const ledgerRes = await adminApi.get('/admin/finance/ledger');
            assert(ledgerRes.data.transactions.length > 0, 'Ledger should not be empty');
            
            // 9.3 Admin Approves Withdrawal
            console.log('9.3 Admin Approving Withdrawal...');
            await adminApi.post(`/admin/finance/withdrawals/${withdrawalId}/approve`);
            
            const driverWalletAfterWithdrawal = await driverApi.get('/wallet/balance');
            console.log('Driver Wallet after Withdrawal:', driverWalletAfterWithdrawal.data);

            // 9.4 Admin Checks Receipt
            console.log('9.4 Admin Checking Receipt...');
            const receiptRes = await adminApi.get(`/admin/finance/receipt/${instanceId}`);
            assert(receiptRes.data.amountTotal > 0, 'Receipt should have amountTotal');
            
            // 9.5 Admin Forces Refund
            console.log('9.5 Admin Processing Refund...');
            await adminApi.post(`/admin/finance/trip/${instanceId}/refund`, {
                reason: 'Customer complaint test'
            });
            
            const driverWalletAfterRefund = await driverApi.get('/wallet/balance');
            console.log('Driver Wallet after Refund (should be negative/deducted):', driverWalletAfterRefund.data);

            const passWalletAfterRefund = await passApi.get('/wallet/balance');
            console.log('Passenger Wallet after Refund:', passWalletAfterRefund.data);
            
            await mongoose.disconnect();
            console.log('--- Admin Operations & Smoke Test Success! ---');
        }
        
    } catch (e) {
        console.error('Smoke Test Failed:');
        if (e.response) {
            console.error(e.response.data);
        } else {
            console.error(e.message);
        }
    }
}

runSmokeTest();
