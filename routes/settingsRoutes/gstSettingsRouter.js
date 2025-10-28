const express= require("express");
const gstSettingsController = require("../../controllers/settingscontroller/gstSettingsController");
const gstSettingsRouter = express.Router();

gstSettingsRouter.post("/create_gst",gstSettingsController.createGst);
gstSettingsRouter.get("/read_gst",gstSettingsController.getGst);
gstSettingsRouter.put("/update_gst/:id",gstSettingsController.updateGst);
gstSettingsRouter.put('/update-status/:id',gstSettingsController.update_active)

module.exports = gstSettingsRouter