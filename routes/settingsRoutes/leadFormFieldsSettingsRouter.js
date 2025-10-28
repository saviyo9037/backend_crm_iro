const express = require('express')
const isAuth = require('../../middleware/isAuth')
const leadFormFieldsSettingsController = require('../../controllers/settingscontroller/leadFormFieldsSettingsController')

const leadFormFieldsSettingsRouter = express.Router()

leadFormFieldsSettingsRouter.post('/add',isAuth,leadFormFieldsSettingsController.add)
leadFormFieldsSettingsRouter.get('/list',isAuth,leadFormFieldsSettingsController.list)
leadFormFieldsSettingsRouter.put('/edit/:id',isAuth,leadFormFieldsSettingsController.edit)
leadFormFieldsSettingsRouter.delete('/delete/:id',isAuth,leadFormFieldsSettingsController.delete)
leadFormFieldsSettingsRouter.put('/update-active/:id',isAuth,leadFormFieldsSettingsController.update_active)
leadFormFieldsSettingsRouter.get('/get/products',isAuth,leadFormFieldsSettingsController.get_products)

module.exports = leadFormFieldsSettingsRouter