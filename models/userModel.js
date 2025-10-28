const { default: mongoose } = require("mongoose");

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String
    },
    password: {
        type: String
    },
    resetPin: {
        type: String
    },
    pinExpires: {
        type: Date
    },
    mobile: {
        type: String,
        unique: true
    },
    role: {
        type: String,
        enum: ['Admin', 'Sub-Admin', 'Agent', 'user']
    },
    profileImage: {
        type: String
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    nextfollowupupdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    assignedAgents: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    assignedLeads: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    status: {
        type: String,
        enum: ['new', 'open', 'converted', 'closed', 'walkin', 'paused', 'rejected', 'unavailable'],
        default: 'new'
    },
    source: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Setting'
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Setting'
    },
    transactions : {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transactions'
    },
    payment : {
        type : mongoose.Schema.Types.ObjectId,
        ref: 'Payment'
    },
    location: {
        type: String
    },
    priority: {
        type: String,
        enum: ['hot', 'warm', 'cold','Not Assigned'],
        default: 'Not Assigned'
    },
    interestedproduct: {
        type: String
    },
    leadvalue: {
        type: Number
    },
    nextFollowUp: {
        type: Date,
    },
    userDetails: [{
        leadFormId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Leadform',
            required: true
        },
        value: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        }
    }]

}, { timestamps: true })

const User = mongoose.model('User', UserSchema)
module.exports = User