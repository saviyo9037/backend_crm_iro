const express = require('express')
const isAuth = require('../middleware/isAuth')
const customersController = require('../controllers/customersController')

const customersRouter = express.Router()

customersRouter.post('/add',isAuth,customersController.add)
customersRouter.get('/list',isAuth,customersController.list)
customersRouter.delete('/delete-multiplecustomers',isAuth,customersController.delete_multiplecustomers)
customersRouter.delete('/delete/:id',isAuth,customersController.delete)
customersRouter.put('/edit/:id',isAuth,customersController.edit)
customersRouter.put('/update-active/:id',isAuth,customersController.update_active)
customersRouter.put('/update-paymentstatus/:id',isAuth,customersController.update_paymentstatus)
customersRouter.put('/update-status/:id',isAuth,customersController.update_status)
customersRouter.get("/get-customer/:id",isAuth,customersController.getCustomer)

module.exports = customersRouter