const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Try to load .env from root or current directory
const rootEnvPath = path.join(__dirname, '..', '.env');
if (require('fs').existsSync(rootEnvPath)) {
    require('dotenv').config({ path: rootEnvPath });
} else {
    require('dotenv').config();
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: '*', // TODO: Lock this down in production to specific domains
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Bypass-Tunnel-Reminder'],
    credentials: true
}));

// Increase limit for Base64 images (TODO: Remove when Cloudinary is implemented)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Database Connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('CRITICAL: MONGODB_URI is not defined in .env');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('CRITICAL: JWT_SECRET is not defined in .env');
    process.exit(1);
}

// Debug URI (hide password)
const uriDebug = MONGODB_URI ? MONGODB_URI.replace(/:([^:@]+)@/, ':****@') : 'undefined';
console.log('Attempting to connect to MongoDB with URI:', uriDebug);

mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000
})
    .then(() => {
        console.log('MongoDB Connected');
        console.log('Connected to Database:', mongoose.connection.name);
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        console.log('URI used:', uriDebug);
    });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/trip', require('./routes/trip'));
// app.use('/api/upload', require('./routes/upload')); // Logic moved to client (Base64)
// app.use('/api/trips', require('./routes/trips')); // To be implemented
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));

// Serve Uploads Static Folder
const fs = require('fs');
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error Handling Middleware
const { errorHandler } = require('./middleware/errorMiddleware');
app.use(errorHandler);

// Base route
app.get('/', (req, res) => {
    res.send('Detour API is running');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
