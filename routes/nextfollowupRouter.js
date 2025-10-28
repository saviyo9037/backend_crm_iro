const express = require('express')
const isAuth = require('../middleware/isAuth')
const nextfollowupController = require('../controllers/nextfollowupController')

const nextfollowupRouter = express.Router()

nextfollowupRouter.get('/get-nextfollowup',isAuth,nextfollowupController.get_setting)
nextfollowupRouter.put('/activate',isAuth,nextfollowupController.set_active)
nextfollowupRouter.put('/inactive',isAuth,nextfollowupController.set_inactive)


module.exports = nextfollowupRouter