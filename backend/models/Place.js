const mongoose = require('mongoose');

const PlaceSchema = new mongoose.Schema({
    label: {
        type: String,
        // required: true // DB data had label "Home", looks like a name
    },
    name: { // Keeping name as alias or for new places if we want
        type: String
    },
    address: {
        type: String,
        required: true
    },
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
    category: {
        type: String,
        enum: ['station', 'airport', 'hospital', 'school', 'other'],
        default: 'other'
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Place', PlaceSchema);
