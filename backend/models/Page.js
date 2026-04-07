const mongoose = require('mongoose');

const PageSchema = new mongoose.Schema({
    pageType: {
        type: String,
        required: true,
        unique: true,
        enum: ['terms', 'privacy', 'contact', 'about', 'help', 'faq']
    },
    content: {
        type: mongoose.Schema.Types.Mixed, // Allows generic object shapes for contact info/faq vs simple HTML strings for terms
        default: ''
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the timestamp before saving
PageSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Page', PageSchema);
