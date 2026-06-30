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
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number], // [longitude, latitude]
            default: [0, 0]
        }
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
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

// Auto-sync location with lat/long before save
PlaceSchema.pre('save', function(next) {
    if (this.isModified('latitude') || this.isModified('longitude')) {
        this.location = {
            type: 'Point',
            coordinates: [this.longitude, this.latitude]
        };
    }
    next();
});

PlaceSchema.index({ 'location': '2dsphere' });
PlaceSchema.index({ category: 1, isDeleted: 1 });

module.exports = mongoose.model('Place', PlaceSchema);
