const mongoose = require('mongoose');

const SavedPlaceSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    label: {
        type: String,
        required: true
    },
    address: String,
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    icon: {
        type: String,
        default: 'map-pin'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('places', SavedPlaceSchema);
