const admin = require('firebase-admin');
const path = require('path');

let bucket;

try {
    const serviceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "detour-ma.firebasestorage.app"
    });
    bucket = admin.storage().bucket();
    console.log('Firebase Admin initialized successfully');
} catch (error) {
    console.error('Firebase Admin initialization failed:', error.message);
    console.error('Please ensure backend/config/firebase-service-account.json is a valid SERVICE ACCOUNT key, not google-services.json.');
    // Mock bucket to prevent crashes in other parts of the app
    bucket = {
        file: () => ({
            createWriteStream: () => {
                const stream = new (require('stream').PassThrough)();
                setTimeout(() => stream.emit('error', new Error('Firebase not configured')), 100);
                return stream;
            }
        })
    };
}

module.exports = { bucket };

