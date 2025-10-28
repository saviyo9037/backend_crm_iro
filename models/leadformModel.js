const { default: mongoose } = require("mongoose");

const leadformSchema = new mongoose.Schema({
    name: {
        type: String
    },
    type: {
        type: String,
        required: true,
        enum: ['text', 'number', 'email', 'textarea', 'file', 'image', 'date', 'choice','checkbox'],
        default: 'text'
    },
    options: [{
        type: String // Explicitly undefined to avoid empty arrays for non-choice types
    }],
    active: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })

const Leadform = mongoose.model('Leadform', leadformSchema)
module.exports = Leadform