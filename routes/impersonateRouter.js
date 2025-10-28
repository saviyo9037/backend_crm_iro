const express = require('express')
const isAuth = require('../middleware/isAuth')
const impersonateController = require('../controllers/impersonateController')

const impersonateRouter = express.Router()

impersonateRouter.post('/:id',isAuth,impersonateController.impersonate)

module.exports = impersonateRouter