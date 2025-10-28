const express = require('express')
const isAuth = require('../../middleware/isAuth')
const documentsSettingsController = require('../../controllers/settingscontroller/documentsSettingsController')

const documentSettingsRouter = express.Router()

documentSettingsRouter.post('/add',isAuth,documentsSettingsController.add)
documentSettingsRouter.get('/list',isAuth,documentsSettingsController.list)
documentSettingsRouter.put('/edit/:id',isAuth,documentsSettingsController.edit)
documentSettingsRouter.delete('/delete/:id',isAuth,documentsSettingsController.delete)
documentSettingsRouter.put('/update-status/:id',isAuth,documentsSettingsController.update_active)

module.exports = documentSettingsRouter