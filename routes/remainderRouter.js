const express = require("express");
const remainderController = require("../controllers/remainderController");
const remainderRouter = express.Router();



remainderRouter.post("/addRemainder",remainderController.add);
remainderRouter.get("/showRemainder/:id",remainderController.list);
remainderRouter.put("/updateRemainder/:id",remainderController.update);
remainderRouter.delete("/deleteRemainder/:id",remainderController.deleteRemainder);



module.exports=remainderRouter;