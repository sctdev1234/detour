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
SavedPlaceSchema.pre('save', function(next) {
    if (this.isModified('latitude') || this.isModified('longitude')) {
        this.location = {
            type: 'Point',
            coordinates: [this.longitude, this.latitude]
        };
    }
    next();
});

SavedPlaceSchema.index({ 'location': '2dsphere' });
SavedPlaceSchema.index({ user: 1, isDeleted: 1 });

module.exports = mongoose.model('places', SavedPlaceSchema);
