const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Ensure upload directories exist
const uploadDirs = ['uploads', 'uploads/cars', 'uploads/documents', 'uploads/avatars'];
uploadDirs.forEach(dir => {
    if (!fs.existsSync(path.join(__dirname, dir))) {
        fs.mkdirSync(path.join(__dirname, dir), { recursive: true });
    }
});

// Database Connection
mongoose.connect('mongodb://localhost:27017/detour')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/cars', require('./routes/cars'));
// app.use('/api/trips', require('./routes/trips')); // To be implemented

// Base route
app.get('/', (req, res) => {
    res.send('Detour API is running');
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
