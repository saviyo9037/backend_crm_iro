const express = require("express");
const paymentController = require("../controllers/paymentController");
const paymentRouter = express.Router();

paymentRouter.post("/addPayment",paymentController.AddPayment)
paymentRouter.get("/get-details/:id",paymentController.getPayment);
paymentRouter.get("/get-detailsed",paymentController.getPayments);
paymentRouter.get("/get-ProductDetails",paymentController.getProductPaymentDetails);
paymentRouter.get("/get-product",paymentController.getProduct);
paymentRouter.get("/get-transactions/:id",paymentController.getTransaction)
paymentRouter.get("/get-gst",paymentController.getGst);
paymentRouter.get("/get-all",paymentController.getAll);
paymentRouter.delete("/deletePayment/:id",paymentController.deleteTransaction);
paymentRouter.put("/update-transaction/:id",paymentController.updateTransaction);

module.exports = paymentRouter;