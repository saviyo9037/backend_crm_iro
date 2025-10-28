const express = require('express')
const createAdmin = require('../scripts/createAdmin')

const registeradminRouter = express.Router()

registeradminRouter.post('/register-admin',createAdmin.register_admin)
registeradminRouter.get('/get-count',createAdmin.count_admin)

module.exports = registeradminRouter