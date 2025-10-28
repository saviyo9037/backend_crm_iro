const express = require('express')
const isAuth = require('../middleware/isAuth')
const tasksController = require('../controllers/tasksController')

const tasksRouter = express.Router()

tasksRouter.post('/add',isAuth,tasksController.add)
tasksRouter.get('/list',isAuth,tasksController.list)
tasksRouter.put('/edit/:id',isAuth,tasksController.edit)
tasksRouter.put('/update-status/:id',isAuth,tasksController.update_status)

module.exports = tasksRouter