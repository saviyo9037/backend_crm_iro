const { default: mongoose } = require("mongoose");

const notificationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    title: {
        type: String
    },
    message: {
        type: String
    },
    isRead: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type:Date,
        default: Date.now()
    }
}, { timestamps: true })

const Notification = mongoose.model('Notification', notificationSchema)
module.exports = Notification