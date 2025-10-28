const express = require("express");
const permissionController = require("../controllers/permissionController");
const permissionRouter = express.Router();



permissionRouter.post("/create",permissionController.createPermission);
permissionRouter.get("/read",permissionController.getPermission);
permissionRouter.put("/update/:id",permissionController.updatePermission);
permissionRouter.delete("/delete/:id",permissionController.deletePermission);



module.exports=permissionRouter;