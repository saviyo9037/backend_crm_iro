const asyncHandler = require("express-async-handler");
const Payment = require("../models/paymentModel");
const Customer = require("../models/customerModel");
const mongoose = require("mongoose");
const Transaction = require("../models/transactionModel");

const paymentstatusController = {
  // Add or update a payment
  addTransaction: asyncHandler(async (req, res) => {
    const {
      customerId,
      paymentdate,
      paymentpaid,
      totalpayment,
      paymentmode,
      nextPaymentDate,
    } = req.body;

    if (!customerId || !paymentpaid || !totalpayment || !paymentmode) {
      return res.status(400).json({
        message:
          "Please provide all required payment details, including customerId",
      });
    }

    if (
      typeof paymentpaid !== "number" ||
      paymentpaid < 0 ||
      typeof totalpayment !== "number" ||
      totalpayment < 0
    ) {
      return res
        .status(400)
        .json({ message: "Payment amounts must be positive numbers" });
    }

    const validModes = ["cash", "card", "online"];
    if (!validModes.includes(paymentmode)) {
      return res.status(400).json({
        message: `Payment mode must be one of: ${validModes.join(", ")}`,
      });
    }
    const today = new Date();

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    // Check if a payment already exists for this customer
    let payment = await Payment.findOne({ customer: customerId });
    const transactionCreated = await Transaction.create({
      customer: customer._id,
      paidAmount: paymentpaid,
      transactionRecordBy: req.user._id,
      transcationDate: paymentdate ? new Date(paymentdate) : today,
    });
    if (!transactionCreated) {
      res.status(500).send("Transaction not Added");
    }

    if (!payment) {
      const paymentCreated = await Payment.create({
        customer: customer._id,
        nextPaymentDate: nextPaymentDate
          ? new Date(nextPaymentDate)
          : today.getMonth() + 1,
        totalAmount: totalpayment,
        totalPaid: paymentpaid,
        nextPaymentEscalatedBy: req.user._id,
        transactions: [transactionCreated._id],
      });
      if (!paymentCreated) {
        res.status(500).send("Payment not Added");
      }
      return res.status(200).send("Transaction added successfully");
    }
    // Update existing payment
    payment.nextPaymentDate = nextPaymentDate
      ? new Date(nextPaymentDate)
      : today.getMonth() + 1;
    payment.totalPaid = paidAmount + payment.paidAmount;
    payment.nextPaymentEscalatedBy = req.user?._id;
    payment.nextPaymentDate = nextPaymentDate
      ? new Date(nextPaymentDate)
      : today.getMonth() + 1;
    payment.transactions.push(transactionCreated._id);

    const updatedPayment = await payment.save();

    transactionCreated.payment = payment._id;
    await transactionCreated.save();

    // Update customer payment status
    const paid = payment.paidAmount ?? 0;
    const total = payment.totalAmount ?? 0;
    customer.payment =
      paid >= total ? "paid" : paid > 0 ? "partially paid" : "pending";
    await customer.save();

    return res.status(200).json({
      message: "Payment updated successfully",
      data: updatedPayment,
    });
  }),

  // Get payment by customer ID
  get: asyncHandler(async (req, res) => {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const payment = await Payment.findById({ customer: customerId })
      .populate("product") // fetch all product fields
      .populate("customer") // fetch all customer fields
      .lean();

    if (!payment) {
      return res
        .status(404)
        .json({ message: "No payment found for this customer" });
    }

    res.status(200).json({
      message: "Payment retrieved successfully",
      data: payment,
    });

  }),

  allTransactions: asyncHandler(async (req, res) => {
    const transactions = await Transaction.find();
    res.status(200).send(transactions);
  }),

  allTransactionsByCustomer: asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const customer = await Customer.findById(customerId);
    if (!customer) {
      res.status(404).send("Customer not Found");
    }
    const transactions = await Transaction.find({ customer: customer._id });
    if (!transactions) {
      res.status(404).send("Transactions not Found");
    }
    res.status(200).send(transactions);
  }),

  editTransactionById: asyncHandler(async (req, res) => {
    const { id: transactionId } = req.params;
    const { transcationDate } = req.body;

    const transactionUpdated = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        transcationDate,
      },
      {
        runValidators: true,
        new: true,
      }
    );
    if (!transactionUpdated) {
      res.status(400).send("Transaction not Updated");
    }
    res.status(200).send(transactionUpdated);
  }),
  deleteTransactionById: asyncHandler(async (req, res) => {
    const { id: transactionId } = req.params;
    const transactionDeleted = await Transaction.findByIdAndDelete(
      transactionId
    );

    if (!transactionDeleted) {
      return res.status(404).send("Transaction not found");
    }

    const paymentUpdated = await Payment.findByIdAndUpdate(
      transactionDeleted.payment,
      { $inc: { totalPaid: -transactionDeleted.paidAmount } },
      { runValidators: true, new: true }
    );

    res.status(200).json({
      message: "Transaction deleted successfully",
      paymentUpdated,
    });
  }),

  getAll: asyncHandler(async (req, res) => {

    const userIds = req.user.assignedLeads.map((item) => item.toString());
    const customers = await Payment.find({}).populate("customer").lean();
    const payments =
      req.user.role === "Admin"
        ? customers
        : customers.filter((item) =>
            userIds.includes(item.customer?.leadId?.toString())
          );
    if (!payments || payments.length === 0) {
      return res.status(404).json({ message: "No payment records found" });
    }

    res.status(200).json({
      message: "All payments retrieved successfully",
      data: payments,
    });
  }),

  totalAmount: asyncHandler(async (req, res) => {
    const { totalAmount, customerId } = req.body;
    if (!totalAmount || !customerId) {
      res.status(404).send("Provide Nescessary Details!!");
    }
    const updatedPayment = await Payment.findOneAndUpdate(
      { customer: customerId },
      { totalAmount },
      {
        runValidators: true,
        new: true,
      }
    );

    if (!updatedPayment) {
      res.status(400).send("Payment not updated");
    }
    res.status(200).send("Total Amount successfully updated");
  }),

  // Edit existing payment by payment ID
  edit: asyncHandler(async (req, res) => {
    const { id } = req.params;
    const {
      paymentdate,
      paymentpaid,
      totalpayment,
      paymentmode,
      date_of_escalation,
    } = req.body;

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    // Optional validations
    if (
      paymentpaid !== undefined &&
      (typeof paymentpaid !== "number" || paymentpaid < 0)
    ) {
      return res
        .status(400)
        .json({ message: "Payment paid must be a positive number" });
    }
    if (
      totalpayment !== undefined &&
      (typeof totalpayment !== "number" || totalpayment < 0)
    ) {
      return res
        .status(400)
        .json({ message: "Total payment must be a positive number" });
    }
    const validModes = ["cash", "card", "online"];
    if (paymentmode && !validModes.includes(paymentmode)) {
      return res.status(400).json({
        message: `Payment mode must be one of: ${validModes.join(", ")}`,
      });
    }

    // Update fields
    payment.date_of_payment = paymentdate
      ? new Date(paymentdate)
      : payment.date_of_payment;
    payment.payment_paid = paymentpaid ?? payment.payment_paid;
    payment.total_payment = totalpayment ?? payment.total_payment;
    payment.payment_mode = paymentmode ?? payment.payment_mode;
    payment.date_of_escalation = date_of_escalation
      ? new Date(date_of_escalation)
      : payment.date_of_escalation;

    const updatedPayment = await payment.save();

    // Update related customer status
    const customer = await Customer.findById(payment.customer);
    if (customer) {
      const paid = payment.payment_paid ?? 0;
      const total = payment.total_payment ?? 0;
      customer.payment =
        paid >= total ? "paid" : paid > 0 ? "partially paid" : "pending";
      await customer.save();
    }

    res.status(200).json({
      message: "Payment updated successfully",
      data: updatedPayment,
    });
  }),
};

module.exports = paymentstatusController;
