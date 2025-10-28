const { default: mongoose } = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Setting",
      required: true,
    },
    totalAmount: { type: Number, required: true },
    totalPaid: { type: Number, default: 0 },

    nextPayments: {
      noOfPayments: { type: Number, required: true }, 
      noOfPaymentsCompleted: { type: Number, default: 0 },
      paymentPerMonth: { type: Number, required: true },
    },

    nextPaymentEscalatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    nextPaymentDate: { type: Date }, // auto-updated by transaction logic
  },
  { timestamps: true }
);

paymentSchema.index({ customer: 1, product: 1 });

const Payment = mongoose.model("Payment", paymentSchema);
module.exports = Payment;
