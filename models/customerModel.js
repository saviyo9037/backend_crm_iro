const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, "Mobile number is required"],
      unique: true,
      match: [/^[+]?[0-9]{10,15}$/, "Enter a valid mobile number"],
    },
    alternativemobile: {
      type: String,
      sparse: true,
    },
    email: {
      type: String,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    payment: {
      type: String,
      enum: ["pending", "partially paid", "paid", "unpaid"],
      default: "pending",
    },
    status: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Setting",
    },
    leadId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    lastContacted: {
      type: Date,
    },
    userDetails: [
      {
        leadFormId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Leadform",
          required: true,
        },
        value: {
          type: mongoose.Schema.Types.Mixed,
          required: true,
        },
      },
    ],
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Setting",
    },
    transactions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Transactions",
      },
    ],
  },
  { timestamps: true }
);

const Customer = mongoose.model("Customer", customerSchema);
module.exports = Customer;