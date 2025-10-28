const express = require('express')
const isAuth = require('../../middleware/isAuth')
const leadSourceSettingsController = require('../../controllers/settingscontroller/leadSourceSettingsController')

const leadSourceSettingsRouter = express.Router()

leadSourceSettingsRouter.post('/add',isAuth,leadSourceSettingsController.add)
leadSourceSettingsRouter.get('/list',isAuth,leadSourceSettingsController.list)
leadSourceSettingsRouter.put('/edit/:id',isAuth,leadSourceSettingsController.edit)
leadSourceSettingsRouter.delete('/delete/:id',isAuth,leadSourceSettingsController.delete)
leadSourceSettingsRouter.put('/update-status/:id',isAuth,leadSourceSettingsController.update_active)

module.exports = leadSourceSettingsRouter