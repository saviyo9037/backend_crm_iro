const express = require('express')
const isAuth = require('../middleware/isAuth')
const notificationController = require('../controllers/notificationController')

const notificationRouter = express.Router()

notificationRouter.get('/get-notifications',isAuth,notificationController.get_notification)
notificationRouter.get('/unread-notifications',isAuth,notificationController.count_unreadnotification)
notificationRouter.put('/markallread',isAuth,notificationController.mark_allread)
notificationRouter.delete('/delete-all',isAuth,notificationController.delete_all)
notificationRouter.delete('/delete/:id',isAuth,notificationController.delete_notification)

module.exports = notificationRouter