const mongoose = require("mongoose");
const productPaymentModel = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Setting",
    required: true,
  },
  Customers: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },
  ],
  payments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  ],
  transactions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transactions",
    },
  ],
});
const ProductPayment = mongoose.model("productPayment", productPaymentModel);
module.exports = ProductPayment;
