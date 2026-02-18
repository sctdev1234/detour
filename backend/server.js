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
const helmet = require('helmet');
app.use(helmet());

const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*', // Allow configuring origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token', 'Bypass-Tunnel-Reminder'],
    credentials: true
};
app.use(cors(corsOptions));

// Body Parser Middleware
// TODO: Migrate all file uploads to GridFS to lower this limit further (e.g., to 1mb)
const BODY_LIMIT = process.env.BODY_LIMIT || '10mb';
app.use(express.json({ limit: BODY_LIMIT }));
app.use(express.urlencoded({ limit: BODY_LIMIT, extended: true }));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Database Connection
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

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB Connected');
        console.log('Connected to Database:', mongoose.connection.name);
    })
    .catch(err => {
        console.error('MongoDB Initial Connection Error:', err);
    });

mongoose.connection.on('error', err => {
    console.error('MongoDB Runtime Connection Error:', err);
});

mongoose.connection.on('disconnected', () => {
    console.log('MongoDB Disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('MongoDB Reconnected');
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
const io = require('socket.io')(server, {
    cors: {
        origin: "*", // Allow all origins for now, restrict in production
        methods: ["GET", "POST"]
    }
});

// Make io available in routes
app.set('socketio', io);

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('join_reclamation', (reclamationId) => {
        socket.join(reclamationId);
        console.log(`Socket ${socket.id} joined reclamation room: ${reclamationId}`);
    });

    socket.on('join_user', (userId) => {
        socket.join(`user:${userId}`);
        console.log(`Socket ${socket.id} joined user room: user:${userId}`);
    });

    socket.on('leave_reclamation', (reclamationId) => {
        socket.leave(reclamationId);
        console.log(`Socket ${socket.id} left reclamation room: ${reclamationId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});



server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
