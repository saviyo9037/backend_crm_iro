const asynchandler = require("express-async-handler");
const Customer = require("../models/customerModel");
const User = require("../models/userModel");
const Setting = require("../models/settingsModel");
const { default: mongoose } = require("mongoose");
const Payment = require("../models/paymentModel");
const Leadform = require("../models/leadformModel");

const customersController = {
  add: asynchandler(async (req, res) => {
    const {
      name,
      mobile,
      alternativemobile,
      email,
      whatsapp,
      status,
      product,
      description,
      address,
    } = req.body;
    const userId = req.user?.id;

    const customer = await Customer.findOne({ email });
    if (customer) {
      return res.status(400).json({ message: "Customer already exists" });
    }
    const mobileExists = await Customer.findOne({ mobile });
    if (mobileExists) {
      return res.status(400).json({ message: "Mobile number exists" });
    }
    const productFind = await Setting.findOne({ product });
    if (!productFind) {
      return res.status(400).send("product not found");
    }
    let customerstatus = null;
    customerstatus = await Setting.findOne({
      title: status,
      type: "customer-status",
    });

    const newcustomer = await Customer.create({
      name,
      mobile,
      alternativemobile,
      email,
      whatsapp,
      description,
      address,
      payment: "pending",
      status: customerstatus ? customerstatus._id : null,
      createdBy: userId,
      isActive: false,
    });

    res.status(200).json({ newcustomer });
  }),

  edit: asynchandler(async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        mobile,
        alternativemobile,
        email,
        product,
      } = req.body;

      // Check if customer exists
      const customer = await Customer.findById(id);
      if (!customer) {
        return res.status(400).json({ message: "Customer does not exist" });
      }

      // Update main fields safely
      customer.name = name ?? customer.name;
      customer.mobile = mobile ?? customer.mobile;
      customer.alternativemobile =
        alternativemobile ?? customer.alternativemobile;
      customer.email = email ?? customer.email;
      customer.product = product ?? customer.product;

      // // Ensure Leadform entries exist or create them
      // const fieldNames = ["whatsapp", "description", "address"];
      // const leadForms = {};

      // for (const field of fieldNames) {
      //   let form = await Leadform.findOne({ name: field });
      //   if (!form) {
      //     form = await Leadform.create({ name: field, type: "text" });
      //   }
      //   leadForms[field] = form._id; // Already ObjectId
      // }

      // // Initialize userDetails array if missing
      // if (!customer.userDetails) customer.userDetails = [];

      // // Push or update userDetails
      // const fieldValues = [
      //   { key: "whatsapp", value: whatsapp },
      //   { key: "description", value: description },
      //   { key: "address", value: address },
      // ];

      // fieldValues.forEach(({ key, value }) => {
      //   if (!value) return; // skip empty

      //   const leadFormId = leadForms[key];
      //   if (!leadFormId) return;

      //   const existingIndex = customer.userDetails.findIndex(
      //     (item) => item.leadFormId?.toString() === leadFormId.toString()
      //   );

      //   if (existingIndex >= 0) {
      //     customer.userDetails[existingIndex].value = value;
      //   } else {
      //     customer.userDetails.push({ leadFormId, value });
      //   }
      // });

      await customer.save();

      res.status(200).json({
        message: "Customer edited successfully",
        edit: customer,
      });
    } catch (error) {
      console.error("Edit customer error:", error);
      res.status(500).json({
        message: "Server error while editing customer",
        error: error.message,
      });
    }
  }),

  list: asynchandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      paymentStatus,
      activestatus,
      searchText,
      date,
      startDate,
      endDate,
    } = req.query;

    let query = {};

    if (
      paymentStatus &&
      ["pending", "partially paid", "paid", "unpaid"].includes(paymentStatus)
    ) {
      query.payment = paymentStatus;
    }

    if (activestatus && ["Active", "Inactive"].includes(activestatus)) {
      query.isActive = activestatus === "Active" ? true : false;
    }

    if (searchText) {
      query.$or = [
        { name: { $regex: searchText, $options: "i" } },
        { mobile: { $regex: searchText, $options: "i" } },
        { email: { $regex: searchText, $options: "i" } },
      ];
    }

    if (date === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.createdAt = {
        $gte: today,
        $lt: new Date(today.getTime() + 86400000),
      };
    } else if (date === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      query.createdAt = {
        $gte: yesterday,
        $lt: new Date(yesterday.getTime() + 86400000),
      };
    } else if (date === "custom" && startDate) {
      const custom = new Date(startDate);
      custom.setHours(0, 0, 0, 0);
      query.createdAt = {
        $gte: custom,
        $lt: new Date(custom.getTime() + 86400000),
      };
    } else if (date === "range" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
      }
    }

    const total = await Customer.countDocuments(query);

    const convertedcustomers = await Customer.find(query)
      .populate("createdBy", "name")
      .populate({
        path: "leadId",
        select: "status userDetails leadvalue source",
        populate: {
          path: "source",
          select: "title",
        },
      })
      .populate("status", "title")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      customers: convertedcustomers,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalCustomers: total,
    });
  }),

  getCustomer: asynchandler(async (req, res) => {
    const { id } = req.params;
    const getCustomer = await Customer.find({ product: id });
    if (!getCustomer) {
      return res.status(404).send("customer not found");
    }

    return res.status(200).json({
      message: "Customer",
      getCustomer,
    });
  }),

  delete: asynchandler(async (req, res) => {
    const { id } = req.params;

    const customerExists = await Customer.findById(id);
    if (!customerExists) {
      return res.status(400).json({ message: "Customer does not exist" });
    }

    // Delete all payments related to this customer
    await Payment.deleteMany({ customer: id });

    // Delete the customer
    await Customer.findByIdAndDelete(id);

    // Update lead status
    await User.findByIdAndUpdate(
      customerExists.leadId,
      { status: "new" },
      { runValidators: true, new: true }
    );

    res.status(200).json({
      message: "Customer and associated payments deleted successfully",
    });
  }),

  delete_multiplecustomers: asynchandler(async (req, res) => {
    const { customerIds } = req.body;

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      return res
        .status(400)
        .json({ message: "customerIds must be a non-empty array" });
    }

    if (!customerIds.every((id) => mongoose.isValidObjectId(id))) {
      return res
        .status(400)
        .json({ message: "One or more customerIds are invalid" });
    }

    const customers = await Customer.find({ _id: { $in: customerIds } });
    if (customers.length !== customerIds.length) {
      return res
        .status(400)
        .json({ message: "One or more customers do not exist" });
    }

    const leadIds = customers
      .map((customer) => customer.leadId)
      .filter((leadId) => leadId);

    // Delete associated payments
    await Payment.deleteMany({ customer: { $in: customerIds } });

    // Delete the customers
    const deleteResult = await Customer.deleteMany({
      _id: { $in: customerIds },
    });

    // Update associated lead statuses to 'new'
    if (leadIds.length > 0) {
      await User.updateMany(
        { _id: { $in: leadIds } },
        { status: "new" },
        { runValidators: true }
      );
    }

    res.status(200).json({
      message: `${deleteResult.deletedCount} customer(s) and their payments deleted successfully`,
    });
  }),

  update_paymentstatus: asynchandler(async (req, res) => {
    const { id } = req.params;
    const { payment } = req.body;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(400).json({ message: "Customer not found" });
    }

    const updatedPayment = await Customer.findByIdAndUpdate(
      id,
      { payment },
      { runValidators: true, new: true }
    );

    res.status(200).json({ updatedPayment });
  }),

  update_status: asynchandler(async (req, res) => {
    try {
      const { id } = req.params;
      let { status } = req.body; // status can be ObjectId string or null

      const customer = await Customer.findById(id);
      if (!customer) {
        return res.status(400).json({ message: "Customer not found" });
      }

      if (status === null || status === "") {
        customer.status = null;
        await customer.save();
        return res.status(200).json({ updatedStatus: customer });
      }

      // Validate status is a valid ObjectId and Setting of type customer-status exists
      const statusSetting = await Setting.findById(status);
      if (!statusSetting || statusSetting.type !== "customer-status") {
        return res.status(400).json({ message: "Invalid status ID" });
      }

      customer.status = statusSetting._id;
      await customer.save();

      res.status(200).json({ updatedStatus: customer });
    } catch (error) {
      res.status(500).json({
        error: "internal server error",
        message: error.message,
      });
    }
  }),

  update_active: asynchandler(async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(400).json({ message: "Customer not found" });
    }

    const updatedActive = await Customer.findByIdAndUpdate(
      id,
      { isActive },
      { runValidators: true, new: true }
    );

    res.status(200).json({ updatedActive });
  }),
};

module.exports = customersController;
