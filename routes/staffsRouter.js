const express = require('express')
const isAuth = require('../middleware/isAuth')
const staffsController = require('../controllers/staffsController')
const preventWriteforImpersoning = require('../middleware/preventWriteforImpersoning')
const { upload } = require('../middleware/cloudinary')

const staffsRouter = express.Router()

staffsRouter.post('/register',isAuth,staffsController.register_staffs)
staffsRouter.post('/upload-profileimage',isAuth,upload.single('profileimage'),staffsController.upload_profileImage)
staffsRouter.get('/get-staffs',isAuth,staffsController.get_staffs)
staffsRouter.get('/get-agents',isAuth,staffsController.get_agents)
staffsRouter.put('/edit-staffs/:id',isAuth,staffsController.edit_staffs)
staffsRouter.put('/change-password/:id',isAuth,staffsController.change_password)
staffsRouter.delete('/delete-staffs/:id',isAuth,staffsController.delete_staffs)

module.exports = staffsRouter