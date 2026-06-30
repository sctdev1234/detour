const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const env = require('./config/env');

const app = express();
const PORT = env.PORT;

// Middleware
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use(mongoSanitize()); // Prevent NoSQL injection attacks

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per `window` (here, per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api', apiLimiter);

const corsOptions = {
    origin: env.CORS_ORIGIN ? env.CORS_ORIGIN.split(',') : '*', // Allow configuring origins
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Bypass-Tunnel-Reminder'],
    credentials: true
};
app.use(cors(corsOptions));

// Body Parser Middleware
// SPRINT-13: Migrate all file uploads to GridFS to lower this limit further (e.g., to 1mb)
const BODY_LIMIT = env.BODY_LIMIT;
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));

app.use((req, res, next) => {
    // console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Database Connection
const MONGODB_URI = env.MONGODB_URI;

// Debug URI (hide password)
const uriDebug = MONGODB_URI ? MONGODB_URI.replace(/:([^:@]+)@/, ':****@') : 'undefined';
/* console.log('Attempting to connect to MongoDB with URI:', uriDebug);*/

mongoose.connect(MONGODB_URI)
    .then(() => {
        /* console.log('MongoDB Connected');*/
        /* console.log('Connected to Database:', mongoose.connection.name);*/
    })
    .catch(err => {
        console.error('MongoDB Initial Connection Error:', err);
        process.exit(1);
    });

mongoose.connection.on('error', err => {
    console.error('MongoDB Runtime Connection Error:', err);
});

mongoose.connection.on('disconnected', () => {
    /* console.log('MongoDB Disconnected');*/
});

mongoose.connection.on('reconnected', () => {
    /* console.log('MongoDB Reconnected');*/
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/cars', require('./routes/cars'));
app.use('/api/tracking', require('./routes/tracking'));
app.use('/api/trip', require('./routes/trip'));
app.use('/api/places', require('./routes/places'));
// app.use('/api/upload', require('./routes/upload')); // Logic moved to client (Base64)
// app.use('/api/trips', require('./routes/trips')); // To be implemented
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/transactions', require('./routes/transactionRoutes'));
app.use('/api/reclamations', require('./routes/reclamations'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/pages', require('./routes/pages'));

// Serve Static Folder if needed (currently cloud-only)
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Error Handling Middleware
const { errorHandler } = require('./middleware/errorMiddleware');
app.use(errorHandler);

// Base route
app.get('/', (req, res) => {
    res.send('Detour API is running');
});

const server = require('http').createServer(app);
const socketModule = require('./sockets/index');
const io = socketModule.init(server);

// Make io available in routes
app.set('socketio', io);

// Initialize Pre-Trip Notifications Cron Job
const scheduleTripNotifications = require('./cron/tripNotifications');
scheduleTripNotifications(io);

const errorHandler = require('./middleware/errorHandler');

// Global Error Handler Middleware
app.use(errorHandler);

server.listen(PORT, '0.0.0.0', () => {
    /* console.log(`Server running on port ${PORT}`);*/
});
