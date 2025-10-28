const express = require('express')
const loginController = require('../controllers/loginController')

const loginRouter = express.Router()

loginRouter.post('/login',loginController.login)

module.exports = loginRouter