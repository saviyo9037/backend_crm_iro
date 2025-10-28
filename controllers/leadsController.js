const mongoose = require("mongoose");
const asynchandler = require("express-async-handler");
const User = require("../models/userModel");
const Customer = require("../models/customerModel");
const Setting = require("../models/settingsModel");
const Leadform = require("../models/leadformModel");
const Notification = require("../models/notificationModel");
const fs = require("fs");
const csv = require("csv-parser");
const { error } = require("console");

const leadsController = {
  add: asynchandler(async (req, res) => {
    const {
      name,
      email,
      mobile,
      source,
      location,
      interestedproduct,
      leadvalue,
      whatsapp,
    } = req.body;

    const adminId = req.user?.id;

    let leadsourcesettings = null;
    if (source) {
      leadsourcesettings = await Setting.findOne({
        title: source,
        type: "lead-sources",
      });
      if (!leadsourcesettings) {
        return res.status(400).json({ message: "Source does not exists" });
      }
    }

    const existingLead = await User.findOne({ email });
    if (existingLead) {
      return res.status(400).json({ message: "Lead with this mail id exists" });
    }

    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return res
        .status(400)
        .json({ message: "Lead with this mobile number exists" });
    }

    const newLead = await User.create({
      name,
      email,
      mobile,
      source: leadsourcesettings ? leadsourcesettings._id : null,
      location,
      interestedproduct,
      leadvalue,
      role: "user",
      createdBy: adminId,
      status: "new",
      whatsapp,
    });

    if (newLead) {
      const creator = await Customer.findById(adminId);
      const notificationRecipients = [];

      // Notify creator
      notificationRecipients.push({
        user: adminId,
        title: "Lead created",
        message: `You created a new lead: ${name}`,
        isRead: false,
      });

      // Admin notification (if creator is not admin)
      if (creator.role !== "Admin") {
        const admin = await User.findOne({ role: "Admin" });
        if (admin) {
          notificationRecipients.push({
            user: admin._id,
            title: "Lead_created",
            message: `A new lead ${name} was created by staff.`,
            isRead: false,
          });
        }

        // Notify agents assigned to this staff
        const agents = await User.find({ assignedTo: adminId, role: "Agent" });
        agents.forEach((agent) => {
          notificationRecipients.push({
            user: agent._id,
            title: "Lead_created",
            message: `A new lead ${name} was created by your staff.`,
            isRead: false,
          });
        });
      }

      await Notification.create(notificationRecipients);
    }
    res
      .status(200)
      .json({ message: "Lead created successfully", data: newLead });
  }),

  assign: asynchandler(async (req, res) => {
    const { id } = req.params;
    const { staffId, isAssigning } = req.body;

    const currentUserId = req.user?.id;
    const currentUser = await User.findById(currentUserId);

    const leads = await User.findById(id);
    if (!leads) {
      return res.status(400).json({ message: "Lead not found" });
    }

    if (!isAssigning) {
      const unassignlead = await User.findByIdAndUpdate(
        id,
        { assignedTo: null },
        { runValidators: true, new: true }
      );
      await User.findByIdAndUpdate(
        staffId,
        { $pull: { assignedLeads: id } },
        { runValidators: true, new: true }
      );
      return res
        .status(200)
        .json({ message: "Lead unassigned successfully", unassignlead });
    }

    const staff = await User.findByIdAndUpdate(
      staffId,
      { $push: { assignedLeads: id } },
      { runValidators: true, new: true }
    );

    if (!staff) {
      return res.status(400).json({ message: "Staff not found" });
    }

    const assignedlead = await User.findByIdAndUpdate(
      id,
      { assignedTo: staffId },
      { runValidators: true, new: true }
    );

    const notifications = [];

    // Notify the assigned staff
    notifications.push({
      user: staffId,
      title: "Lead Assigned",
      message: `You have been assigned a new lead: ${leads.name}`,
    });

    // Notify the admin
    const admins = await User.find({ role: "Admin" });
    admins.forEach((admin) => {
      notifications.push({
        user: admin._id,
        title: "Lead Assigned",
        message: `Lead ${leads.name} was assigned to ${staff.name}${
          currentUserId !== admin._id ? ` by ${currentUser.name}` : ""
        }.`,
      });
    });

    // Notify assigning staff if not admin
    if (currentUser.role !== "Admin") {
      notifications.push({
        user: currentUserId,
        title: "Lead Assigned",
        message: `You assigned lead ${leads.name} to ${staff.name}`,
      });
    }

    await Notification.insertMany(notifications);

    res.status(200).json({ assignedlead });
  }),

  list: asynchandler(async (req, res) => {
    const { role, id } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Extract filter parameters
    const {
      priority,
      status,
      assignedTo,
      searchText,
      date,
      startDate,
      endDate,
      sortBy,
      filterleads,
    } = req.query;

    let query = { role: "user" };

    // Role-based query
    if (role === "Admin") {
      query = { role: "user" };
    } else if (role === "Sub-Admin") {
      query = { role: "user", $or: [{ createdBy: id }, { assignedTo: id }] };
    } else {
      query = { role: "user", assignedTo: id };
    }

    // Apply filters
    if (
      priority &&
      ["hot", "warm", "cold", "Not Assigned"].includes(priority)
    ) {
      query.priority = priority;
    }
    if (filterleads === "Assigned") {
      query.assignedTo = { $exists: true, $ne: null };
    } else if (filterleads === "Unassigned") {
      query.assignedTo = { $exists: false };
    }
    if (
      status &&
      [
        "new",
        "open",
        "converted",
        "walkin",
        "paused",
        "rejected",
        "unavailable",
      ].includes(status)
    ) {
      query.status = status;
    }
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    if (searchText) {
      query.$or = [
        { name: { $regex: searchText, $options: "i" } },
        { mobile: { $regex: searchText, $options: "i" } },
      ];
    }
    if (date === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.createdAt = {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    } else if (date === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      query.createdAt = {
        $gte: yesterday,
        $lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
      };
    } else if (date === "custom" && startDate) {
      const customDate = new Date(startDate);
      customDate.setHours(0, 0, 0, 0);
      query.createdAt = {
        $gte: customDate,
        $lt: new Date(customDate.getTime() + 24 * 60 * 60 * 1000),
      };
    } else if (date === "range" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
      }
    }

    // Sorting
    let sort = { createdAt: -1 }; // Default sort by createdAt descending
    if (sortBy === "ascleadvalue") {
      sort = { leadvalue: 1 };
    } else if (sortBy === "descleadvalue") {
      sort = { leadvalue: -1 };
    }

    const total = await User.countDocuments(query);
    const leads = await User.find(query)
      .populate("createdBy", "name")
      .populate("assignedTo", "name")
      .populate("updatedBy", "name")
      .populate("nextfollowupupdatedBy", "role name")
      .populate("source")
      .populate("userDetails.leadFormId", "name type options ")
      
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const leadforms = await Leadform.find();

    res.status(200).json({
      leads,
      leadforms,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalLeads: total,
    });
  }),

  update_status: asynchandler(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const lead = await User.findById(id);
    const customerExists = await Customer.findOne({ leadId: id });

    if (!lead) {
      return res.status(400).json({ message: "Lead not found" });
    }

    if (status === "converted") {
      let customerstatus = null;
      customerstatus = await Setting.findOne({
        title: status,
        type: "customer-status",
      });

      if (!customerExists) {
        const newcustomer = await Customer.create({
          name: lead.name,
          mobile: lead.mobile,
          leadId: id,

          alternativemobile: lead.whatsappNumber,
          email: lead.email || null,
          payment: "pending",
          status: customerstatus ? customerstatus._id : null,
          isActive: false,
          createdBy: userId,
          whatsapp: lead.whatsapp,
        });
      }
    } else {
      if (customerExists) {
        await Customer.findByIdAndDelete(customerExists._id);
      }
    }

    const convertedLead = await User.findByIdAndUpdate(
      id,
      { status, updatedBy: userId },
      { runValidators: true, new: true }
    );

    const updater = await User.findById(userId);
    const admin = await User.findOne({ role: "Admin" });

    const notificationRecipients = [];

    // Always notify the user who updated
    notificationRecipients.push({
      user: userId,
      title: "Lead Status Updated",
      message: `You updated status of ${lead.name} to ${convertedLead.status}`,
      isRead: false,
    });

    // Always notify Admin (if updater is not admin)
    if (admin && admin._id.toString() !== userId) {
      notificationRecipients.push({
        user: admin._id,
        title: "Lead Status Updated",
        message: `Status of ${lead.name} updated to ${convertedLead.status} by ${updater.name}`,
        isRead: false,
      });
    }

    // Notify lead owner (staff assigned to the lead)
    if (lead.createdBy && lead.createdBy.toString() !== userId) {
      notificationRecipients.push({
        user: lead.createdBy,
        title: "Lead Status Updated",
        message: `Status of ${lead.name} updated to ${convertedLead.status}`,
        isRead: false,
      });
    }

    // If updater is Agent, notify their assigned subadmin
    if (updater.role === "Agent" && updater.assignedTo) {
      const subadmin = await User.findById(updater.assignedTo);
      if (subadmin && subadmin._id.toString() !== userId) {
        notificationRecipients.push({
          user: subadmin._id,
          title: "Lead Status Updated",
          message: `Status of ${lead.name} updated to ${convertedLead.status} by your agent`,
          isRead: false,
        });
      }
    }

    // NEW: If updater is Subadmin, notify agents assigned to this subadmin
    // Notify the agent assigned to the lead, if any
    if (lead.assignedTo) {
      const assignedAgent = await User.findById(lead.assignedTo);
      if (
        assignedAgent &&
        assignedAgent._id.toString() !== userId &&
        !notificationRecipients.some(
          (n) => n.user.toString() === assignedAgent._id.toString()
        )
      ) {
        notificationRecipients.push({
          user: assignedAgent._id,
          title: "Lead Status Updated",
          message: `Status of ${lead.name} updated to ${convertedLead.status}`,
          isRead: false,
        });
      }
    }

    await Notification.create(notificationRecipients);

    res.status(200).json({ message: "Status updated successfully" });
  }),

  list_openleads: asynchandler(async (req, res) => {
    const { id, role } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      priority,
      assignedTo,
      searchText,
      date,
      startDate,
      endDate,
      sortBy,
    } = req.query;

    let query = { role: "user" };

    // Role-based query
    if (role === "Admin") {
      query = { role: "user", status: "open" };
    } else if (role === "Sub-Admin") {
      query = {
        role: "user",
        status: "open",
        $or: [{ createdBy: id }, { assignedTo: id }],
      };
    } else {
      query = { role: "user", status: "open", assignedTo: id };
    }

    if (priority && ["hot", "warm", "cold", "Lukewarm"].includes(priority)) {
      query.priority = priority;
    }
    if (assignedTo) {
      query.assignedTo = assignedTo;
    }
    if (searchText) {
      query.$or = [
        { name: { $regex: searchText, $options: "i" } },
        { mobile: { $regex: searchText, $options: "i" } },
      ];
    }
    if (date === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query.createdAt = {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      };
    } else if (date === "yesterday") {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      query.createdAt = {
        $gte: yesterday,
        $lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000),
      };
    } else if (date === "custom" && startDate) {
      const customDate = new Date(startDate);
      customDate.setHours(0, 0, 0, 0);
      query.createdAt = {
        $gte: customDate,
        $lt: new Date(customDate.getTime() + 24 * 60 * 60 * 1000),
      };
    } else if (date === "range" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
      }
    }

    // Sorting
    let sort = { createdAt: -1 }; // Default sort by createdAt descending
    if (sortBy === "ascleadvalue") {
      sort = { leadvalue: 1 };
    } else if (sortBy === "descleadvalue") {
      sort = { leadvalue: -1 };
    }

    const total = await User.countDocuments(query);
    const leads = await User.find(query)
      .populate("createdBy", "name")
      .populate("assignedTo", "name")
      .populate("updatedBy", "name")
      .populate("nextfollowupupdatedBy", "role name")
      .populate("source")
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const leadforms = await Leadform.find();

    res.status(200).json({
      leads,
      leadforms,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalLeads: total,
    });
  }),

  update_priority: asynchandler(async (req, res) => {
    const { id } = req.params;
    const { priority } = req.body;
    const customer = await User.findById(id);
    if (!customer) {
      return res.status(400).json({ message: "Customer not found" });
    }

    const updatedPriority = await User.findByIdAndUpdate(
      id,
      { priority },
      { runValidators: true, new: true }
    );

    res.status(200).json({ message: "Priority updated successfully" });
  }),

  update_details: asynchandler(async (req, res) => {
    const { id } = req.params;
    const {
      name,
      email,
      mobile,
      source,
      location,
      interestedproduct,
      leadvalue,
      whatsapp,
      userDetails, // full array update
      leadFormId, // single item update
      newValue, // new value for that item
    } = req.body;

    // Find customer
    const customer = await User.findById(id);
    if (!customer)
      return res.status(404).json({ message: "Customer not found" });

    // Check duplicate email
    if (email && email !== customer.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail)
        return res.status(400).json({ message: "Email already exists" });
      customer.email = email;
    }

    // Check duplicate mobile
    if (mobile && mobile !== customer.mobile) {
      const existingMobile = await User.findOne({ mobile });
      if (existingMobile)
        return res
          .status(400)
          .json({ message: "Mobile number already exists" });
      customer.mobile = mobile;
    }

    // Update basic fields
    if (name) customer.name = name;
    if (location) customer.location = location;
    if (interestedproduct) customer.interestedproduct = interestedproduct;
    if (leadvalue) customer.leadvalue = leadvalue;
    if (whatsapp) customer.whatsapp = whatsapp;

    // Validate and update source
    if (source) {
      const leadSourceSetting = await Setting.findOne({
        title: source,
        type: "lead-sources",
      });
      if (!leadSourceSetting)
        return res.status(400).json({ message: "Invalid source" });
      customer.source = leadSourceSetting._id;
    }

    // Full array replacement
    if (userDetails && Array.isArray(userDetails)) {
      const validData = userDetails.map((item) => ({
        leadFormId: new mongoose.Types.ObjectId(item.leadFormId),
        value: item.value,
      }));
      customer.userDetails = validData;
    }

    // 🔹 Update single userDetails item (if leadFormId + newValue provided)
    if (leadFormId && newValue) {
      const index = customer.userDetails.findIndex(
        (item) => item.leadFormId.toString() === leadFormId.toString()
      );

      if (index !== -1) {
        customer.userDetails[index].value = newValue;
      } else {
        // optional: add new if not found
        customer.userDetails.push({
          leadFormId: new mongoose.Types.ObjectId(leadFormId),
          value: newValue,
        });
      }
    }

    // Save changes
    await customer.save();

    // Return populated data
    const updatedCustomer = await User.findById(id).populate(
      "userDetails.leadFormId"
    );

    res.status(200).json({
      message: "Customer updated successfully",
      updatedCustomer,
    });
  }),

  set_nextfollowup: asynchandler(async (req, res) => {
    const { id } = req.params;
    const { nextFollowUp } = req.body;
    const userId = req.user?.id;

    const lead = await User.findById(id);
    if (!lead) {
      return res.status(400).json({ message: "Lead does not exists" });
    }
    const setnextFollowup = await User.findByIdAndUpdate(
      id,
      { nextFollowUp, nextfollowupupdatedBy: userId },
      { runValidators: true, new: true }
    ).populate("nextfollowupupdatedBy", "role name");
    res.status(200).json({ setnextFollowup });

    if (setnextFollowup && nextFollowUp) {
      const updater = await User.findById(userId);
      const admin = await User.findOne({ role: "Admin" });

      const notificationRecipients = [];

      // Always notify the updater
      notificationRecipients.push({
        user: userId,
        title: "Next Follow-up Set",
        message: `You set next follow-up for ${lead.name} on ${nextFollowUp}`,
        isRead: false,
      });

      // Notify Admin (if not the updater)
      if (admin && admin._id.toString() !== userId) {
        notificationRecipients.push({
          user: admin._id,
          title: "Next Follow-up Set",
          message: `Next follow-up for ${lead.name} set on ${nextFollowUp} by ${updater.name}`,
          isRead: false,
        });
      }

      // Notify lead owner (staff who created the lead)
      if (lead.createdBy && lead.createdBy.toString() !== userId) {
        notificationRecipients.push({
          user: lead.createdBy,
          title: "Next Follow-up Set",
          message: `Next follow-up for ${lead.name} set on ${nextFollowUp}`,
          isRead: false,
        });
      }

      // Notify the agent assigned to the lead
      if (lead.assignedTo) {
        const assignedAgent = await User.findById(lead.assignedTo);
        if (
          assignedAgent &&
          assignedAgent._id.toString() !== userId &&
          !notificationRecipients.some(
            (n) => n.user.toString() === assignedAgent._id.toString()
          )
        ) {
          notificationRecipients.push({
            user: assignedAgent._id,
            title: "Next Follow-up Set",
            message: `Next follow-up for ${lead.name} set on ${nextFollowUp}`,
            isRead: false,
          });
        }
      }

      // If updater is Agent, notify their subadmin
      if (updater.role === "Agent" && updater.assignedTo) {
        const subadmin = await User.findById(updater.assignedTo);
        if (
          subadmin &&
          subadmin._id.toString() !== userId &&
          !notificationRecipients.some(
            (n) => n.user.toString() === subadmin._id.toString()
          )
        ) {
          notificationRecipients.push({
            user: subadmin._id,
            title: "Next Follow-up Set",
            message: `Next follow-up for ${lead.name} set on ${nextFollowUp} by your agent`,
            isRead: false,
          });
        }
      }

      await Notification.create(notificationRecipients);
    }
  }),
  update_userleadform: asynchandler(async (req, res) => {
  const { id } = req.params;
  const userDetails = req.body;
  const fileUrl = req.files?.[0]?.path;

  // Try finding in User collection
  let user = await User.findById(id);
  let customer = null;

  // If not found in User, check in Customer
  if (!user) {
    customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({ message:  "Customer not found" });
    }
  }

  // Prepare data array
  const data = Object.keys(userDetails).map((key) => ({
    leadFormId: key,
    value: userDetails[key],
  }));

  // If there’s a file uploaded, add it to data
  if (fileUrl) {
    data.push({
      leadFormId: req.files[0].fieldname,
      value: fileUrl,
    });
  }

  let updatedRecord;

  if (user) {
    // Update user
    user.userDetails = data;
    updatedRecord = await user.save();
  } else if (customer) {
    // Update customer
    customer.userDetails = data;
    updatedRecord = await customer.save();
  }

  const leadforms = await Leadform.find();

  res.status(200).json({
    message: "User lead form updated successfully",
    updatedRecord,
    leadforms,
  });
}),


  upload_csvbulkleads: asynchandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const userName = req.user?.name;
    const userID = req.user?.id;

    const leads = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (row) => {
        const normalizedRow = {};
        for (const key in row) {
          normalizedRow[key.trim().toLowerCase()] = row[key].trim();
        }

        if (!normalizedRow.name || !normalizedRow.mobile) {
          console.warn(
            `Invalid row: ${JSON.stringify(row)}. Missing name or mobile.`
          );
          return;
        }

        leads.push({
          name: normalizedRow.name,
          mobile: normalizedRow.mobile,
          email: normalizedRow.email || null,
          source: normalizedRow.source || "",
          location: normalizedRow.location || "",
          interestedproduct: normalizedRow.interestedproduct || "",
          leadvalue: normalizedRow.leadvalue || "",
          role: "user",
          whatsapp: normalizedRow.whatsapp,
        });
      })
      .on("end", async () => {
        try {
          const createdByUser = await User.findOne({ name: userName });
          if (!createdByUser) {
            return res.status(404).json({ message: "Creator user not found" });
          }

          const processedLeads = [];

          for (const lead of leads) {
            // Check for duplicate mobile
            const existingLead = await User.findOne({ mobile: lead.mobile });
            if (existingLead) {
              console.warn(
                `Skipping lead with mobile ${lead.mobile} due to duplicate.`
              );
              continue;
            }

            let sourceDoc = null;
            if (lead.source) {
              sourceDoc = await Setting.findOne({
                title: lead.source,
                type: "lead-sources",
              });
              if (!sourceDoc) {
                console.warn(
                  `Source "${lead.source}" not found. Setting as null.`
                );
              }
            }

            processedLeads.push({
              name: lead.name,
              mobile: lead.mobile,
              email: lead.email || null,
              createdBy: createdByUser._id,
              source: sourceDoc ? sourceDoc._id : null,
              location: lead.location,
              interestedproduct: lead.interestedproduct,
              leadvalue: lead.leadvalue,
              role: lead.role,
              whatsapp: lead.whatsapp,
            });
          }

          if (processedLeads.length === 0) {
            return res.status(400).json({
              message: "No valid leads to upload after filtering duplicates",
            });
          }

          await User.insertMany(processedLeads, { ordered: false });
          fs.unlinkSync(req.file.path);

          // Notification logic
          const notificationRecipients = [];
          notificationRecipients.push({
            user: userID,
            title: "Bulk Leads Created",
            message: `You uploaded ${processedLeads.length} bulk leads.`,
            isRead: false,
          });

          if (createdByUser.role !== "Admin") {
            const admin = await User.findOne({ role: "Admin" });
            if (admin) {
              notificationRecipients.push({
                user: admin._id,
                title: "Bulk Leads Uploaded",
                message: `${createdByUser.name} uploaded ${processedLeads.length} new leads via CSV.`,
                isRead: false,
              });
            }

            const agents = await User.find({
              assignedTo: userID,
              role: "Agent",
            });
            agents.forEach((agent) => {
              notificationRecipients.push({
                user: agent._id,
                title: "Bulk Leads Uploaded",
                message: `${createdByUser.name} uploaded ${processedLeads.length} new leads.`,
                isRead: false,
              });
            });
          }

          await Notification.create(notificationRecipients);

          res.status(200).json({
            message: `Successfully uploaded ${processedLeads.length} leads`,
          });
        } catch (err) {
          console.error(err);
          res.status(500).json({
            message: "Error uploading leads. Ensure mobile numbers are unique.",
          });
        }
      });
  }),

  download_csvtemplate: asynchandler(async (req, res) => {
    const csvHeaders =
      "Name,Mobile,Source,Location,Interestedproducts,Leadvalue\n";
    const sampleRow = "John Doe,Naukri,Thrissur,BCA,20000\n";
    const csvData = csvHeaders + sampleRow;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=lead-template.csv"
    );
    res.status(200).send(csvData);
  }),

  view_pdf: asynchandler(async (req, res) => {
    const cloudinaryUrl = req.query.url;

    if (!cloudinaryUrl) {
      return res.status(400).send("Missing URL parameter");
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline"); // Force inline display
    response.data.pipe(res); // Stream the PDF data to the client
  }),

  delete_multipleleads: asynchandler(async (req, res) => {
    const { leadIds } = req.body; // Expecting an array of lead IDs in the request body

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Lead IDs are required and must be an array" });
    }

    // Validate that all IDs are valid ObjectIds
    const { ObjectId } = require("mongoose").Types;
    const invalidIds = leadIds.filter((id) => !ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res
        .status(400)
        .json({ message: `Invalid lead IDs: ${invalidIds.join(", ")}` });
    }

    // Delete leads with the provided IDs
    const result = await User.deleteMany({
      _id: { $in: leadIds },
      role: "user", // Ensure only leads (role: 'user') are deleted
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No leads found to delete" });
    }

    res
      .status(200)
      .json({ message: `${result.deletedCount} lead(s) deleted successfully` });
  }),

  // removeRejectedFollowup : async (req, res) => {
  //   try {
  //     const lead = await Leadform.findById(req.params.id);

  //     if (!lead) return res.status(404).json({ message: "Lead not found" });

  //     // Keep only non-rejected
  //     lead.followups = lead.followups.filter(fs => fs.status !== "rejected");

  //     await lead.save();

  //     res.json({ message: "Rejected follow-ups removed successfully" });
  //   } catch (error) {
  //     res.status(500).json({ message: error.message });
  //   }
  // }
};

module.exports = leadsController;
