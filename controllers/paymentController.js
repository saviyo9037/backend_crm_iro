const expressAsyncHandler = require("express-async-handler");
const Payment = require("../models/paymentModel");
const Setting = require("../models/settingsModel");
const Customer = require("../models/customerModel");
const { totalAmount } = require("./paymentstatusController");
const Transaction = require("../models/transactionModel");
const Payments = require("../models/PaymentSchemas");

const paymentController = {
  AddPayment: expressAsyncHandler(async (req, res) => {
    try {
      const {
        productId,
        customerId,
        paidAmount,
        transactionDate,
        paymentMode,
        transactionRecordBy,
      } = req.body;

      // 🔹 Step 1: Validate required fields
      if (
        !productId ||
        !customerId ||
        !paidAmount ||
        !transactionDate ||
        !paymentMode
      ) {
        return res.status(400).json({
          success: false,
          message: "Please provide all required fields.",
      
        customerId,
        paidAmount,
        transactionDate,
        paymentMode,
        transactionRecordBy,
        productId,
        });
      }

      const [product, gst, customer] = await Promise.all([
        Setting.findById(productId),
        Setting.findOne({ type: "gst" }).select("gst_amount"),
        Customer.findById(customerId),
      ]);

      if (!product) {
        return res.status(404).json({ message: "Product not found." });
      }
      if (!gst) {
        return res.status(404).json({ message: "GST not found." });
      }
      if (!customer) {
        return res.status(404).json({ message: "Customer not found." });
      }

      // 🔹 Step 3: Calculate totals
      const gstAmount = (product.amount * gst.gst_amount) / 100;
      const totalAmount = Math.round(product.amount + gstAmount);

      // 🔹 Step 4: Find or create Payment
      let payment = await Payment.findOne({
        customer: customerId,
        product: productId,
      });

      if (!payment) {
        payment = await Payment.create({
          customer: customerId,
          product: productId,
          totalAmount,
          nextPayments: {
            noOfPayments: product.duration,
            paymentPerMonth: Math.round(totalAmount / product.duration),
          },
          nextPaymentEscalatedBy: transactionRecordBy,
        });
      }

      // 🔹 Step 5: Check if payment exceeds total amount
      if (payment.totalPaid + paidAmount > totalAmount) {
        return res.status(400).json({
          success: false,
          message: "Paid amount cannot exceed the total amount.",
        });
      }

      // 🔹 Step 6: Prevent further payments if fully paid
      if (payment.totalPaid >= totalAmount) {
        return res.status(400).json({
          success: false,
          message: "This customer has already completed the full payment.",
        });
      }

      // 🔹 Step 7: Create Transaction
      const newTransaction = await Transaction.create({
        payment: payment._id,
        paidAmount,
        transactionRecordBy,
        transactionDate,
        paymentMode,
      });

      // 🔹 Step 8: Update payment and customer status
      payment.totalPaid += paidAmount;

      if (payment.totalPaid >= totalAmount) {
        customer.payment = "paid";
      } else if (payment.totalPaid > 0) {
        customer.payment = "partially paid";
      } else {
        customer.payment = "unpaid";
      }

      await Promise.all([payment.save(), customer.save()]);

      // 🔹 Step 9: Return success response
      return res.status(200).json({
        success: true,
        message: "Payment and transaction added successfully.",
        payment,
        transaction: newTransaction,
      });
    } catch (error) {
      console.error("Error in AddPayment:", error);
      return res.status(500).json({
        success: false,
        message: "Server error while adding payment.",
        error: error.message,
      });
    }
  }),
  getPayment: expressAsyncHandler(async (req, res) => {
    const productId = req.params.id;
    const customerList = await Customer.find({ product: productId })
      .populate("payment")
      .populate("customer").select("name _id")
      .populate("transactions");

    if (!customerList) {
      return res.status(404).send("payment not found");
    }
    return res.status(200).json({
      message: "All payment",
      customerList,
    });
  }),
    getPayments: expressAsyncHandler(async (req, res) => {
    const allPayment = await Payments.find().populate("customer", "name").populate("transactions", "paidAmount");

    if (!allPayment) {
      return res.status(404).send("payment not found");
    }
    console.log(allPayment)
    return res.status(200).json({
        message : "All payment",
        allPayment
    });
   }),
  getAll: expressAsyncHandler(async (req, res) => {
    const getAll = await Transaction.find().populate({
      path: "payment",
      populate: {
        path: "customer",
      },
    });
    if (!getAll) {
      return res.status(404).send("payment not found");
    }

    return res.status(200).json({
      message: "All payment",
      getAll,
    });
  }),
  getProductPaymentDetails: expressAsyncHandler(async (req, res) => {
    const getProductPayment = await Transaction.find()
      .populate({
        path: "payment",
         select: "totalAmount totalPaid customer product",
        populate: [
          { path: "customer", select: "name" },
          { path: "product", select: "title _id" },
        ],
      })
      .populate("transactionRecordBy", "name")
      .lean();

    if (!getProductPayment) {
      return res.status(404).send("payment not found");
    }

    return res.status(200).json({
      message: "All payment",
      getProductPayment,
    });
  }),
  getProduct: expressAsyncHandler(async (req, res) => {
    const getProduct = await Setting.find({ type: "products" });
    if (!getProduct) {
      return res.status(404).send("Product not found", getProduct);
    }
    return res.status(200).json({
      message: "All product",
      getProduct,
    });
  }),
  getTransaction: expressAsyncHandler(async (req, res) => {
    try {
      const { id } = req.params;

      const payments = await Payment.find({ customer: id }).select("_id");

      if (!payments || payments.length === 0) {
        return res.status(200).json({
          message: "No payments found for this customer",
        });
      }

      const paymentIds = payments.map((p) => p._id);

      const transactions = await Transaction.find({
        payment: { $in: paymentIds },
      })
        .select("transactionDate paidAmount paymentMode")
        .populate("transactionRecordBy", "name role");

      if (!transactions || transactions.length === 0) {
        return res.status(200).json({
          message: "No transactions found for this customer",
          count: 0,
          transactions: [],
        });
      }

      return res.status(200).json({
        message: "Transactions fetched successfully",
        count: transactions.length,
        transactions,
      });
    } catch (error) {
      console.error("Error fetching transactions:", error);
      return res.status(500).json({
        message: "Server error while fetching transactions",
        error: error.message,
      });
    }
  }),

  getGst: expressAsyncHandler(async (req, res) => {
    const gst = await Setting.find({ type: "gst" }).select("gst_amount");

    if (!gst.length) {
      return res.status(404).json({ message: "GST value not found" });
    }

    return res.status(200).json({
      message: "GST fetched successfully",
      gst,
    });
  }),
  deleteTransaction: expressAsyncHandler(async (req, res) => {
    const transactId = req.params.id;
    if (!transactId) {
      return res
        .status(400)
        .json({ success: false, message: "Transaction ID is required." });
    }

    const transaction = await Transaction.findById(transactId);
    if (!transaction) {
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found." });
    }

    // This will trigger your schema's post("remove") middleware
    await transaction.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Transaction deleted successfully.",
      transaction,
    });
  }),

updateTransaction: expressAsyncHandler(async (req, res) => {
  const { newData } = req.body;
  const transactId = req.params.id;

  if (!newData || !transactId) {
    return res.status(400).json({
      success: false,
      message: "Invalid input data",
    });
  }

  // Allow only specific fields to be updated
  const allowedFields = ["paidAmount", "paymentMode", "transactionDate"];
  const filteredData = {};

  for (const key of allowedFields) {
    if (newData[key] !== undefined) filteredData[key] = newData[key];
  }

  if (Object.keys(filteredData).length === 0) {
    return res.status(400).json({
      success: false,
      message: "No valid fields to update",
    });
  }

  // 🔹 Update the Transaction
  const updatedTransaction = await Transaction.findByIdAndUpdate(
    transactId,
    { $set: filteredData },
    { new: true }
  );

  if (!updatedTransaction) {
    return res.status(404).json({
      success: false,
      message: "Transaction not found",
    });
  }

  // 🔹 Find the related Payment
  const payment = await Payment.findById(updatedTransaction.payment)
    .populate("customer")
    .populate("product");

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: "Payment not found",
    });
  }

  // 🔹 Recalculate totalPaid from all transactions under this payment
  const allTransactions = await Transaction.find({ payment: payment._id });
  const totalPaid = allTransactions.reduce(
    (sum, txn) => sum + (txn.paidAmount || 0),
    0
  );

  // 🔹 Update Payment totalPaid and nextPaymentDate
  payment.totalPaid = totalPaid;
  payment.nextPaymentDate = newData.transactionDate || payment.nextPaymentDate;
  await payment.save();

  // 🔹 Update Customer Payment Status
  const customer = await Customer.findById(payment.customer._id);
  if (customer) {
    let newStatus = "pending";

    if (totalPaid >= payment.totalAmount) {
      newStatus = "paid";
    } else if (totalPaid > 0 && totalPaid < payment.totalAmount) {
      newStatus = "partially paid";
    }

    customer.payment = newStatus;
    await customer.save();
  }

  return res.status(200).json({
    success: true,
    message: "Transaction updated successfully",
    updatedTransaction,
    updatedPayment: payment,
    updatedCustomer: customer,
  });
}),

};
module.exports = paymentController;
