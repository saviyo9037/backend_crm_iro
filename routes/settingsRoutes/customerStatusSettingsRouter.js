const express = require('express')
const isAuth = require('../../middleware/isAuth')
const customerstatusSettingsController = require('../../controllers/settingscontroller/customerstatusSettingsController')

const customerstatusSettingsRouter = express.Router()

customerstatusSettingsRouter.post('/add',isAuth,customerstatusSettingsController.add)
customerstatusSettingsRouter.get('/list',isAuth,customerstatusSettingsController.list)
customerstatusSettingsRouter.put('/edit/:id',isAuth,customerstatusSettingsController.edit)
customerstatusSettingsRouter.delete('/delete/:id',isAuth,customerstatusSettingsController.delete)
customerstatusSettingsRouter.put('/update-status/:id',isAuth,customerstatusSettingsController.update_active)

module.exports = customerstatusSettingsRouter