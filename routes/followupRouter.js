const express = require("express");
const followupController = require("../controllers/followupController");
const followupRouter = express.Router();



followupRouter.post("/create-description",followupController.add);
followupRouter.get("/list-description/:leadId",followupController.show);



module.exports=followupRouter