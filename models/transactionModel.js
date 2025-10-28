const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },
    paidAmount: {
      type: Number,
      required: true,
      min: [1, "Paid amount must be greater than zero"],
    },
    transactionRecordBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    paymentMode: {
      type: String,
      enum: ["cash", "card", "upi", "bank_transfer"],
      required: true,
    },
  },
  { timestamps: true }
);

// Index for faster lookups
transactionSchema.index({ payment: 1 });

// Helper: Calculate next payment date (30 days by default)
function calculateNextPaymentDate(lastDate, days = 30) {
  return new Date(lastDate.getTime() + days * 24 * 60 * 60 * 1000);
}

// ✅ After saving a transaction
transactionSchema.post("save", async function (doc) {
  const Payment = require("./paymentModel");

  const payment = await Payment.findById(doc.payment);
  if (!payment) return;

  // Update totals safely
  payment.totalPaid = (payment.totalPaid || 0) + doc.paidAmount;

  // Update completed payments count if structure exists
  if (payment.nextPayments) {
    payment.nextPayments.noOfPaymentsCompleted = Math.min(
      (payment.nextPayments.noOfPaymentsCompleted || 0) + 1,
      payment.nextPayments.noOfPayments || 1
    );
  }

  // Update status logic dynamically
  const currentDate = new Date();
  if (payment.totalPaid >= payment.totalAmount) {
    payment.status = "paid";
    payment.nextPaymentDate = null;
  } else if (payment.totalPaid > payment.totalAmount / 2) {
    payment.status = "partially paid";
    payment.nextPaymentDate = calculateNextPaymentDate(doc.transactionDate);
  } else if (payment.nextPaymentDate && currentDate > payment.nextPaymentDate){
    payment.status = "pending";
    payment.nextPaymentDate = calculateNextPaymentDate(doc.transactionDate);
  }else {
    payment.status = "unpaid";
    payment.nextPaymentDate = calculateNextPaymentDate(doc.transactionDate);
  }

  await payment.save();
});

// ✅ After removing a transaction
transactionSchema.post("deleteOne", { document: true, query: false }, async function (doc) {
  const Payment = require("./paymentModel");
  const payment = await Payment.findById(this.payment);
  if (!payment) return;

  payment.totalPaid = Math.max((payment.totalPaid || 0) - this.paidAmount, 0);

  if (payment.nextPayments && payment.nextPayments.noOfPaymentsCompleted > 0) {
    payment.nextPayments.noOfPaymentsCompleted -= 1;
  }

  if (payment.totalPaid >= payment.totalAmount) {
    payment.status = "paid";
    payment.nextPaymentDate = null;
  } else if (payment.totalPaid > payment.totalAmount / 2) {
    payment.status = "partially paid";
    payment.nextPaymentDate = new Date();
  } else {
    payment.status = "pending";
    payment.nextPaymentDate = new Date();
  }

  await payment.save();
});


const Transaction = mongoose.model("Transactions", transactionSchema);
module.exports = Transaction;
