const express = require('express')
const isAuth = require('../middleware/isAuth')
const teamsController = require('../controllers/teamsController')

const teamsRouter = express.Router()

teamsRouter.put('/assign-team/:id',isAuth,teamsController.assign_team)
teamsRouter.put('/unassign-team/:id',isAuth,teamsController.unassign_team)

module.exports = teamsRouter