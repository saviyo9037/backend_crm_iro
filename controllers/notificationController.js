const asynchandler = require('express-async-handler')
const Notification = require('../models/notificationModel')
const { default: mongoose } = require('mongoose')

const notificationController = {
    get_notification: asynchandler(async (req, res) => {
        const userId = req.user?.id

        const notifications = await Notification.find({ user: userId }).sort({ createdAt: -1 })
        res.status(200).json(notifications)
    }),

    count_unreadnotification: asynchandler(async (req, res) => {
        const userId = req.user?.id

        const count = await Notification.countDocuments({ user: userId, isRead: false })

        res.status(200).json({ count })
    }),

    mark_allread: asynchandler(async (req, res) => {
        const userId = req.user?.id
        const objectUserId = new mongoose.Types.ObjectId(userId)

        const markednotificationsread = await Notification.updateMany(
            { user: objectUserId, isRead: false },
            { $set: { isRead: true } }
        )

        res.status(200).json({ markednotificationsread })
    }),

    delete_notification: asynchandler(async (req, res) => {
        const { id } = req.params;
        const deletedNotification = await Notification.findByIdAndDelete(id)
        res.status(200).json({ message: "Notification deleted successfully" })
    }),

    delete_all: asynchandler(async (req, res) => {
        const userId = req.user?.id
        const deletefullnotifications = await Notification.deleteMany({ user: userId })
        res.status(200).json({ message: "All notifications deleted successfully" })
    })
}

module.exports = notificationController