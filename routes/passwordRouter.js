const express = require('express')
const passwordController = require('../controllers/passwordController')

const passwordRouter = express.Router()

passwordRouter.post('/forgot-password',passwordController.forgot_password)
passwordRouter.post('/reset-password',passwordController.reset_password)

module.exports = passwordRouter