const mongoose = require("mongoose");
const asynchandler = require("express-async-handler");
const User = require("../models/userModel");
const Customer = require("../models/customerModel");
const Setting = require("../models/settingsModel");
const Leadform = require("../models/leadformModel");
const Notification = require("../models/notificationModel");

const fs = require("fs");
const csv = require("csv-parser");
const axios = require("axios");

// ===================== LEADS CONTROLLER =====================

const leadsController = {
  // ========= 1. MONTHLY SUMMARY (Reports) =========
  getMonthlySummary: asynchandler(async (req, res) => {
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(new Date().setMonth(end.getMonth() - 6));

    const monthlySummary = await User.aggregate([
      {
        $match: {
          role: "user",
          createdAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          newLeads: {
            $sum: { $cond: [{ $eq: ["$status", "new"] }, 1, 0] },
          },
          closedLeads: {
            $sum: {
              $cond: [
                { $in: ["$status", ["closed", "converted", "rejected"]] },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    const formattedSummary = monthlySummary.map((item) => ({
      month: `${item._id.year}-${String(item._id.month).padStart(2, "0")}`,
      newLeads: item.newLeads,
      closedLeads: item.closedLeads,
    }));

    res.status(200).json({ monthlySummary: formattedSummary });
  }),

  // ========= 2. ADD LEAD =========
  add: asynchandler(async (req, res) => {
    console.log("--- leadsController.add ---");
    console.log("Body:", req.body);

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

    // Check duplicate email only if provided
    if (email) {
      const existingLead = await User.findOne({ email });
      if (existingLead) {
        return res
          .status(400)
          .json({ message: "Lead with this mail id exists" });
      }
    }

    // Check duplicate mobile always
    const mobileExists = await User.findOne({ mobile });
    if (mobileExists) {
      return res
        .status(400)
        .json({ message: "Lead with this mobile number exists" });
    }

    // Role-based default assignment
    const roleCheck = await User.findById(adminId);
    let assignedTo = null;
    if (roleCheck && roleCheck.role === "Agent") {
      assignedTo = adminId; // agent creating gets assigned to self
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
      assignedTo,
      status: "new",
      whatsapp,
    });

    if (newLead) {
      const creator = await User.findById(adminId);
      console.log("Lead creator:", creator?.role, creator?.name);
      const notificationRecipients = [];

      // Notify creator
      notificationRecipients.push({
        user: adminId,
        title: "Lead created",
        message: `You created a new lead: ${name}`,
        isRead: false,
      });

      // If creator is not Admin, notify Admin + agents under this staff
      if (creator && creator.role !== "Admin") {
        const admin = await User.findOne({ role: "Admin" });
        if (admin) {
          notificationRecipients.push({
            user: admin._id,
            title: "Lead_created",
            message: `A new lead ${name} was created by staff.`,
            isRead: false,
          });
        }

        // Agents assigned to this staff
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

  // ========= 3. ASSIGN / UNASSIGN LEAD =========
  
  assign: asynchandler(async (req, res) => {
    const { id } = req.params;
    const { staffId, isAssigning } = req.body;

    const currentUserId = req.user?.id;
    const currentUser = await User.findById(currentUserId);

    const leads = await User.findById(id);
    if (!leads) {
      return res.status(400).json({ message: "Lead not found" });
    }

    const staffToAssign = await User.findById(staffId);
    if (!staffToAssign) {
      return res.status(400).json({ message: "Staff to assign not found" });
    }

    // Role-based assignment logic
    if (currentUser.role === "Admin") {
      // Admin can assign to anyone (Sub-Admin or Agent)
    } else if (currentUser.role === "Sub-Admin") {
      // Sub-Admin can only assign to Agents
      if (staffToAssign.role !== "Agent") {
        return res.status(403).json({ message: "Sub-Admin can only assign leads to Agents" });
      }
    } else {
      // Other roles (e.g., Agent) cannot assign leads
      return res.status(403).json({ message: "You are not authorized to assign leads" });
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


  // ========= 4. ADMIN LEADS LIST =========
  listLeadsAdmin: asynchandler(async (req, res) => {
    if (req.user.role !== "Admin") {
      return res
        .status(403)
        .json({ message: "Forbidden: Only Admin users can access this resource." });
    }

    const page = parseInt(req.query.page) || 1;
    const limit =
      req.query.noLimit === "true"
        ? Number.MAX_SAFE_INTEGER
        : parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      priority,
      status,
      searchText,
      startDate,
      endDate,
      sortBy,
      filterleads,
    } = req.query;

    let query = { role: "user" };

    if (
      priority &&
      ["hot", "warm", "cold", "Not Assigned"].includes(priority)
    ) {
      query.priority = priority;
    }

    if (filterleads === "Assigned") {
      query.assignedTo = { $exists: true, $ne: null };
    } else if (filterleads === "Unassigned") {
      // treat missing or null as unassigned
      query.$or = [{ assignedTo: { $exists: false } }, { assignedTo: null }];
    }

    if (searchText) {
      query.name = { $regex: searchText, $options: "i" };
    }

    if (status) {
      const validStatuses = [
        "new",
        "open",
        "converted",
        "walkin",
        "paused",
        "rejected",
        "unavailable",
      ];
      if (Array.isArray(status)) {
        const filtered = status.filter((s) => validStatuses.includes(s));
        if (filtered.length) query.status = { $in: filtered };
      } else if (validStatuses.includes(status)) {
        query.status = status;
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: end };
      }
    }

    let sort = { createdAt: -1 };
    if (sortBy === "ascleadvalue") sort = { leadvalue: 1 };
    else if (sortBy === "descleadvalue") sort = { leadvalue: -1 };

    const total = await User.countDocuments(query);

    const aggregationPipeline = [
      { $match: query },
      { $sort: sort },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "createdBy",
          foreignField: "_id",
          as: "createdByUser",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "assignedTo",
          foreignField: "_id",
          as: "assignedToUser",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "updatedBy",
          foreignField: "_id",
          as: "updatedByUser",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "nextfollowupupdatedBy",
          foreignField: "_id",
          as: "nextfollowupupdatedByUser",
        },
      },
      {
        $lookup: {
          from: "settings",
          localField: "source",
          foreignField: "_id",
          as: "sourceDetails",
        },
      },
      { $unwind: { path: "$createdByUser", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$assignedToUser", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$updatedByUser", preserveNullAndEmptyArrays: true } },
      {
        $unwind: {
          path: "$nextfollowupupdatedByUser",
          preserveNullAndEmptyArrays: true,
        },
      },
      { $unwind: { path: "$sourceDetails", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          name: 1,
          email: 1,
          mobile: 1,
          location: 1,
          interestedproduct: 1,
          leadvalue: 1,
          role: 1,
          status: 1,
          whatsapp: 1,
          createdAt: 1,
          updatedAt: 1,
          priority: 1,
          nextFollowUp: 1,
          createdBy: {
            _id: "$createdByUser._id",
            name: "$createdByUser.name",
          },
          assignedTo: {
            _id: "$assignedToUser._id",
            name: "$assignedToUser.name",
            role: "$assignedToUser.role",
          },
          updatedBy: {
            _id: "$updatedByUser._id",
            name: "$updatedByUser.name",
          },
          nextfollowupupdatedBy: {
            _id: "$nextfollowupupdatedByUser._id",
            role: "$nextfollowupupdatedByUser.role",
            name: "$nextfollowupupdatedByUser.name",
          },
          source: "$sourceDetails",
          userDetails: 1,
        },
      },
    ];

    const leads = await User.aggregate(aggregationPipeline);
    const leadforms = await Leadform.find();

    res.status(200).json({
      leads,
      leadforms,
      currentPage: req.query.noLimit === "true" ? 1 : page,
      totalPages:
        req.query.noLimit === "true" ? 1 : Math.ceil(total / limit),
      totalLeads: total,
    });
  }),

  // ========= 5. AGENT / SUBADMIN LEAD COUNTS =========
  getAgentSubAdminLeadCounts: asynchandler(async (req, res) => {
    const leadCounts = await User.aggregate([
      { $match: { role: "user" } },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "assignedToUser",
        },
      },
      { $unwind: "$assignedToUser" },
      {
        $project: {
          _id: 0,
          userId: "$_id",
          name: "$assignedToUser.name",
          role: "$assignedToUser.role",
          count: "$count",
        },
      },
    ]);

    res.status(200).json({ leadCounts });
  }),

  // ========= 6. LEADS LIST (role-based: Admin / SubAdmin / Agent) =========
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
      if (role === "Sub-Admin") {
        const subAdmin = await User.findById(id).populate('assignedAgents', 'id');
        const agentIds = subAdmin.assignedAgents.map(agent => agent.id);
        query = {
          role: "user",
          $or: [
            { createdBy: id },
            { assignedTo: id },
            { createdBy: { $in: agentIds } },
            { assignedTo: { $in: agentIds } },
          ],
        };
      } else if(role === "Agent") {
              query = { role: "user", $or: [{ createdBy: id }, { assignedTo: id }] };
      } else { // Agent and other roles
        query = { role: "user" };
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
      if (searchText) {
        query.name = { $regex: searchText, $options: "i" };
      }
      //............savio changed.....
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          query.createdAt = { $gte: start, $lte: end };
        }
      } else if (date === "today") {
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
      }
  
      // Sorting
      let sort = { createdAt: -1 }; // Default sort by createdAt descending
      if (sortBy === "ascleadvalue") {
        sort = { leadvalue: 1 };
      } else if (sortBy === "descleadvalue") {
        sort = { leadvalue: -1 };
      }
  
      const total = await User.countDocuments(query);
      let leadsQuery = User.find(query)
        .populate("createdBy", "name")
        .populate("assignedLeads","name")
        .populate("assignedTo", "name")
        .populate("updatedBy", "name")
        .populate("nextfollowupupdatedBy", "role name")
        .populate("source")
        .populate("userDetails.leadFormId", "name type options ")
        .sort(sort);
  
      if (req.query.noLimit !== 'true') {
        leadsQuery = leadsQuery.skip(skip).limit(limit);
      }

      const interestedproduct = await Setting.findOne(leadsQuery.interestedproduct);
  
      const leads = await leadsQuery;
  
      const leadforms = await Leadform.find();
  
      res.status(200).json({
        leads,
        leadforms,
        currentPage: req.query.noLimit === 'true' ? 1 : page,
        totalPages: req.query.noLimit === 'true' ? 1 : Math.ceil(total / limit),
        totalLeads: total,
      });
    }),
  

  // ========= 7. UPDATE LEAD STATUS (with transaction) =========
  update_status: asynchandler(async (req, res) => {
    console.log("--- leadsController.update_status ---");
    console.log("Params:", req.params);
    console.log("Body:", req.body);

    const { id } = req.params;
    const { status } = req.body;
    const userId = req.user?.id;

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const lead = await User.findById(id).session(session);
      if (!lead) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Lead not found" });
      }

      if (status === "converted") {
        const customerExists = await Customer.findOne({ leadId: id }).session(
          session
        );
        if (!customerExists) {
          const customerstatus = await Setting.findOne({
            title: status,
            type: "customer-status",
          }).session(session);

          await Customer.create(
            [
              {
                name: lead.name,
                mobile: lead.mobile,
                leadId: id,
                alternativemobile: lead.whatsapp, // fixed from whatsappNumber
                email: lead.email || null,
                payment: "pending",
                status: customerstatus ? customerstatus._id : null,
                isActive: false,
                createdBy: userId,
                whatsapp: lead.whatsapp,
              },
            ],
            { session }
          );
        }
      } else {
        const customerExists = await Customer.findOne({ leadId: id }).session(
          session
        );
        if (customerExists) {
          await Customer.findByIdAndDelete(customerExists._id).session(
            session
          );
        }
      }

      const convertedLead = await User.findByIdAndUpdate(
        id,
        { status, updatedBy: userId },
        { runValidators: true, new: true }
      ).session(session);

      await session.commitTransaction();
      session.endSession();

      // Notifications after transaction
      const updater = await User.findById(userId);
      const admin = await User.findOne({ role: "Admin" });

      const notificationRecipients = [];

      // Notify updater
      notificationRecipients.push({
        user: userId,
        title: "Lead Status Updated",
        message: `You updated status of ${lead.name} to ${convertedLead.status}`,
        isRead: false,
      });

      // Notify Admin if updater is not admin
      if (admin && admin._id.toString() !== userId) {
        notificationRecipients.push({
          user: admin._id,
          title: "Lead Status Updated",
          message: `Status of ${lead.name} updated to ${convertedLead.status} by ${updater.name}`,
          isRead: false,
        });
      }

      // Notify lead owner (creator)
      if (lead.createdBy && lead.createdBy.toString() !== userId) {
        notificationRecipients.push({
          user: lead.createdBy,
          title: "Lead Status Updated",
          message: `Status of ${lead.name} updated to ${convertedLead.status}`,
          isRead: false,
        });
      }

      // If updater is Agent, notify their Sub-Admin
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

      // Notify assigned agent of this lead
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
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      console.error("Error updating status:", error);
      res
        .status(500)
        .json({ message: "Error updating status", error: error.message });
    }
  }),

  // ========= 8. OPEN LEADS LIST =========
  list_openleads: asynchandler(async (req, res) => {
    console.log("--- leadsController.list_openleads ---");
    console.log("Query:", req.query);

    const { id, role } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit =
      req.query.noLimit === "true"
        ? Number.MAX_SAFE_INTEGER
        : parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      priority,
      assignedTo,
      searchText,
      date,
      startDate,
      endDate,
      sortBy,
      filterleads,
    } = req.query;

    let query = { role: "user", status: "open" };

    // Role-based restrictions
    if (role === "Admin") {
      // see all
    } else if (role === "Sub-Admin") {
      const subAdmin = await User.findById(id);
      const agentIds = subAdmin?.assignedAgents || [];
      query.$or = [
        { createdBy: id },
        { assignedTo: id },
        { assignedTo: { $in: agentIds } },
      ];
    } else {
      // Agents
      query.assignedTo = id;
    }

    if (priority && ["hot", "warm", "cold", "Lukewarm"].includes(priority)) {
      query.priority = priority;
    }

    // noLimit / assignedTo filter
    if (req.query.noLimit === "true") {
      // remove assignedTo restriction if any
      if (query.assignedTo && role === "Agent") {
        delete query.assignedTo;
      }
    } else if (assignedTo && filterleads !== "All") {
      query.assignedTo = assignedTo;
    }

    if (searchText) {
      query.$or = [
        { name: { $regex: searchText, $options: "i" } },
        { mobile: { $regex: searchText, $options: "i" } },
      ];
    }

    // Date filters
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
      const endD = new Date(endDate);
      if (!isNaN(start.getTime()) && !isNaN(endD.getTime())) {
        endD.setHours(23, 59, 59, 999);
        query.createdAt = { $gte: start, $lte: endD };
      }
    }

    // Sort
    let sort = { createdAt: -1 };
    if (sortBy === "ascleadvalue") sort = { leadvalue: 1 };
    else if (sortBy === "descleadvalue") sort = { leadvalue: -1 };

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

  // ========= 9. UPDATE PRIORITY =========
  update_priority: asynchandler(async (req, res) => {
    console.log("--- leadsController.update_priority ---");
    console.log("Params:", req.params);
    console.log("Body:", req.body);

    const { id } = req.params;
    const { priority } = req.body;

    const lead = await User.findById(id);
    if (!lead) {
      return res.status(400).json({ message: "Lead not found" });
    }

    await User.findByIdAndUpdate(
      id,
      { priority },
      { runValidators: true, new: true }
    );

    res.status(200).json({ message: "Priority updated successfully" });
  }),

  // ========= 10. UPDATE LEAD DETAILS =========
  update_details: asynchandler(async (req, res) => {
    console.log("--- leadsController.update_details ---");
    console.log("Params:", req.params);
    console.log("Body:", req.body);

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
      userDetails,
      leadFormId,
      newValue,
    } = req.body;

    const lead = await User.findById(id);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }

    // email duplicate check
    if (email && email !== lead.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      lead.email = email;
    }

    // mobile duplicate check
    if (mobile && mobile !== lead.mobile) {
      const existingMobile = await User.findOne({ mobile });
      if (existingMobile) {
        return res
          .status(400)
          .json({ message: "Mobile number already exists" });
      }
      lead.mobile = mobile;
    }

    if (name) lead.name = name;
    if (location) lead.location = location;
    if (interestedproduct) lead.interestedproduct = interestedproduct;
    if (leadvalue) lead.leadvalue = leadvalue;
    if (whatsapp) lead.whatsapp = whatsapp;

    if (source) {
      const leadSourceSetting = await Setting.findOne({
        title: source,
        type: "lead-sources",
      });
      if (!leadSourceSetting) {
        return res.status(400).json({ message: "Invalid source" });
      }
      lead.source = leadSourceSetting._id;
    }

    if (userDetails && Array.isArray(userDetails)) {
      const validData = userDetails.map((item) => ({
        leadFormId: new mongoose.Types.ObjectId(item.leadFormId),
        value: item.value,
      }));
      lead.userDetails = validData;
    }

    if (leadFormId && newValue) {
      const index = lead.userDetails.findIndex(
        (item) => item.leadFormId.toString() === leadFormId.toString()
      );

      if (index !== -1) {
        lead.userDetails[index].value = newValue;
      } else {
        lead.userDetails.push({
          leadFormId: new mongoose.Types.ObjectId(leadFormId),
          value: newValue,
        });
      }
    }

    lead.updatedBy = req.user.id;

    await lead.save();

    const updatedLead = await User.findById(id).populate(
      "userDetails.leadFormId"
    );

    res.status(200).json({
      message: "Lead updated successfully",
      updatedLead,
    });
  }),

  // ========= 11. SET NEXT FOLLOW-UP =========
  set_nextfollowup: asynchandler(async (req, res) => {
    console.log("--- leadsController.set_nextfollowup ---");
    console.log("Params:", req.params);
    console.log("Body:", req.body);

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

      notificationRecipients.push({
        user: userId,
        title: "Next Follow-up Set",
        message: `You set next follow-up for ${lead.name} on ${nextFollowUp}`,
        isRead: false,
      });

      if (admin && admin._id.toString() !== userId) {
        notificationRecipients.push({
          user: admin._id,
          title: "Next Follow-up Set",
          message: `Next follow-up for ${lead.name} set on ${nextFollowUp} by ${updater.name}`,
          isRead: false,
        });
      }

      if (lead.createdBy && lead.createdBy.toString() !== userId) {
        notificationRecipients.push({
          user: lead.createdBy,
          title: "Next Follow-up Set",
          message: `Next follow-up for ${lead.name} set on ${nextFollowUp}`,
          isRead: false,
        });
      }

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

  // ========= 12. UPDATE USER LEAD FORM (Lead or Customer) =========
  update_userleadform: asynchandler(async (req, res) => {
    console.log("--- leadsController.update_userleadform ---");
    console.log("Params:", req.params);
    console.log("Body:", req.body);

    const { id } = req.params;
    const userDetails = req.body;
    const fileUrl = req.files?.[0]?.path;

    let lead = await User.findById(id);
    let customer = null;

    if (!lead) {
      customer = await Customer.findById(id);
      if (!customer) {
        return res.status(404).json({ message: "Record not found" });
      }
    }

    const data = Object.keys(userDetails).map((key) => ({
      leadFormId: key,
      value: userDetails[key],
    }));

    if (fileUrl) {
      data.push({
        leadFormId: req.files[0].fieldname,
        value: fileUrl,
      });
    }

    let updatedRecord;
    if (lead) {
      lead.userDetails = data;
      updatedRecord = await lead.save();
    } else {
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

  // ========= 13. CSV BULK UPLOAD LEADS =========
  upload_csvbulkleads: asynchandler(async (req, res) => {
    console.log("--- leadsController.upload_csvbulkleads ---");
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

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
          whatsapp: normalizedRow.whatsapp,
          assignedto: normalizedRow.assignedto || "",
        });
      })
      .on("end", async () => {
        try {
          const createdByUser = await User.findById(userID);
          if (!createdByUser) {
            return res
              .status(404)
              .json({ message: "Creator user not found" });
          }

          const processedLeads = [];

          // Pre-check duplicates by mobile
          const existingMobiles = (
            await User.find({
              mobile: { $in: leads.map((l) => l.mobile) },
            }).select("mobile")
          ).map((l) => l.mobile);

          for (const lead of leads) {
            if (existingMobiles.includes(lead.mobile)) {
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

            // Determine assignedTo
            let assignedTo = null;
            if (lead.assignedto) {
              const assignedToUser = await User.findOne({
                name: lead.assignedto,
              });
              if (assignedToUser) {
                assignedTo = assignedToUser._id;
              } else {
                console.warn(
                  `Agent "${lead.assignedto}" not found. Lead will not be assigned to this agent.`
                );
              }
            } else {
              // If not set in CSV, assign based on uploader's role
              if (
                createdByUser.role === "Agent" ||
                createdByUser.role === "Sub-Admin"
              ) {
                assignedTo = createdByUser._id;
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
              role: "user",
              whatsapp: lead.whatsapp,
              assignedTo,
            });
          }

          if (processedLeads.length === 0) {
            return res.status(400).json({
              message:
                "No valid leads to upload after filtering duplicates or invalid rows",
            });
          }

          await User.insertMany(processedLeads, { ordered: false });
          fs.unlinkSync(req.file.path);

          // Notifications
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
            data: processedLeads,
          });
        } catch (err) {
          console.error(err);
          res.status(500).json({
            message:
              "Error uploading leads. Ensure mobile numbers are unique.",
          });
        }
      });
  }),

  // ========= 14. CSV TEMPLATE DOWNLOAD =========
  download_csvtemplate: asynchandler(async (req, res) => {
    console.log("--- leadsController.download_csvtemplate ---");

    const csvHeaders =
      "Name,Mobile,Source,Location,Interestedproducts,Leadvalue,Assignedto\n";
    const sampleRow =
      "John Doe,9876543210,Naukri,Thrissur,BCA,20000,AgentName\n";

    const csvData = csvHeaders + sampleRow;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=lead-template.csv"
    );
    res.status(200).send(csvData);
  }),

  // ========= 15. VIEW PDF FROM CLOUDINARY =========
  view_pdf: asynchandler(async (req, res) => {
    console.log("--- leadsController.view_pdf ---");
    console.log("Query:", req.query);

    const cloudinaryUrl = req.query.url;
    if (!cloudinaryUrl) {
      return res.status(400).send("Missing URL parameter");
    }

    try {
      const response = await axios({
        method: "get",
        url: cloudinaryUrl,
        responseType: "stream",
      });

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline");
      response.data.pipe(res);
    } catch (error) {
      console.error("Error fetching PDF from Cloudinary:", error);
      res.status(500).send("Error fetching PDF");
    }
  }),

  // ========= 16. DELETE MULTIPLE LEADS =========
  delete_multipleleads: asynchandler(async (req, res) => {
    console.log("--- leadsController.delete_multipleleads ---");
    console.log("Body:", req.body);

    const { leadIds } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      return res
        .status(400)
        .json({ message: "Lead IDs are required and must be an array" });
    }

    const { ObjectId } = require("mongoose").Types;
    const invalidIds = leadIds.filter((id) => !ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res
        .status(400)
        .json({ message: `Invalid lead IDs: ${invalidIds.join(", ")}` });
    }

    const result = await User.deleteMany({
      _id: { $in: leadIds },
      role: "user", // ensure only leads deleted
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No leads found to delete" });
    }

    res.status(200).json({
      message: `${result.deletedCount} lead(s) deleted successfully`,
    });
  }),

  // ========= 17. DELETE ALL LEADS (ADMIN ONLY) =========
  deleteAllLeads: asynchandler(async (req, res) => {
    if (req.user.role !== "Admin") {
      return res.status(403).json({
        message: "Forbidden: Only Admin users can delete all leads.",
      });
    }

    const result = await User.deleteMany({ role: "user" });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "No leads found to delete." });
    }

    res.status(200).json({
      message: `${result.deletedCount} leads deleted successfully.`,
    });
  }),
};

module.exports = leadsController;
