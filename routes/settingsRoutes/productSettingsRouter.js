const express = require("express");
const isAuth = require("../../middleware/isAuth");
const productSettingsController = require("../../controllers/settingscontroller/productSettingsController");
const productSettingsRouter = express.Router();

productSettingsRouter.post("/add", isAuth, productSettingsController.addProduct);
productSettingsRouter.get("/list", isAuth, productSettingsController.getProducts);
productSettingsRouter.put("/update-title/:id", isAuth, productSettingsController.updateProductTitle);
productSettingsRouter.put("/update-active/:id", isAuth, productSettingsController.updateProductActive);
productSettingsRouter.delete("/delete/:id", isAuth, productSettingsController.deleteProduct)

module.exports = productSettingsRouter;