const asynchandler = require("express-async-handler");
require("dotenv").config();
const JWT = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/userModel");

const staffsController = {
  register_staffs: asynchandler(async (req, res) => {
    const { name, email, mobile, role } = req.body;

    const existingSubadmin = await User.findOne({ email });
    if (existingSubadmin) {
      return res.status(400).json({ message: "Staff already exists" });
    }
    const mobileExist = await User.findOne({ mobile });
    if (mobileExist) {
      return res.status(400).json({ message: "Mobile number exists" });
    }

    const hashvalidate = await bcrypt.hash(mobile, 12);

    const newSubadmin = await User.create({
      name,
      email,
      mobile,
      password: hashvalidate,
      role,
    });

    const payload = {
      id: newSubadmin._id,
      name: newSubadmin.name,
    };

    const token = JWT.sign(payload, process.env.JWT_SECRET_KEY);

    res.status(200).json({
      message: "Staff created successfully",
      token,
    });
  }),

  edit_staffs: asynchandler(async (req, res) => {
    const { id } = req.params;
    const { name, mobile, email } = req.body;

    const staff = await User.findById(id);
    if (!staff) {
      return res.status(400).json({ message: "Staff not found" });
    }
    // const emailExists = await User.findOne({ email });
    // if (emailExists) {
    //   return res.status(400).json({ message: "Email already exists" });
    // }

    // const mobileExists = await User.findOne({ mobile });
    // if (mobileExists) {
    //   return res.status(400).json({ message: "Mobile already exists" });
    // }

    if (name) {
      staff.name = name;
    }

    if (mobile) {
      staff.mobile = mobile;
    }

    if (email) {
      staff.email = email;
    }

    await staff.save();

    res.status(200).json({ staff });
  }),
delete_staffs : asynchandler(async (req, res) => {
  if (req.user.role !== "Admin") {
    return res
      .status(403)
      .json({ message: "Forbidden: Only Admin users can delete staff." });
  }

  const { id } = req.params;      // staff to delete
  const { newUserId } = req.body; // new Sub-Admin or new Agent

  if (!id) {
    return res.status(400).json({ message: "User id is required" });
  }
  if (!newUserId) {
    return res.status(400).json({ message: "newUserId is required" });
  }

  const deletingUser = await User.findById(id);
  if (!deletingUser) {
    return res.status(400).json({ message: "User does not exist" });
  }

  const newUser = await User.findById(newUserId);
  if (!newUser) {
    return res.status(400).json({ message: "New user does not exist" });
  }

  // ---------------------------------------------
  // CASE 1: DELETING A SUB-ADMIN → MOVE AGENTS
  // ---------------------------------------------
  if (deletingUser.role === "Sub-Admin") {
    // Safety: newUser must also be Sub-Admin
    if (newUser.role !== "Sub-Admin") {
      return res
        .status(400)
        .json({ message: "New user must be a Sub-Admin when deleting a Sub-Admin" });
    }

    // ✅ This is the critical part:
    // We assume agents under this Sub-Admin are stored in deletingUser.assignedAgents
    const agentsUnderSubAdmin = deletingUser.assignedAgents || [];

    // 1) Reassign those agents' assignedTo to the new SubAdmin
    if (agentsUnderSubAdmin.length > 0) {
      await User.updateMany(
        { _id: { $in: agentsUnderSubAdmin }, role: "Agent" },
        { $set: { assignedTo: newUserId } }
      );

      // 2) Add these agents into the new SubAdmin.assignedAgents array
      await User.findByIdAndUpdate(
        newUserId,
        { $addToSet: { assignedAgents: { $each: agentsUnderSubAdmin } } },
        { new: true }
      );
    }

    // 3) Optionally: reassign leads directly assigned to this SubAdmin
    await User.updateMany(
      { assignedTo: id, role: "user" },
      { $set: { assignedTo: newUserId } }
    );
  }

  // ---------------------------------------------
  // CASE 2: DELETING AN AGENT → MOVE LEADS
  // ---------------------------------------------
  if (deletingUser.role === "Agent") {
    // Safety: newUser should be Agent or Sub-Admin (you choose).
    // Here, we allow both.
    await User.updateMany(
      { assignedTo: id, role: "user" },
      { $set: { assignedTo: newUserId } }
    );

    // If you also maintain assignedLeads on staff, move them:
    await User.findByIdAndUpdate(
      newUserId,
      { $addToSet: { assignedLeads: { $each: deletingUser.assignedLeads || [] } } },
      { new: true }
    );
  }

  // ---------------------------------------------
  // FINALLY DELETE THE STAFF
  // ---------------------------------------------
  await User.findByIdAndDelete(id);

  return res.status(200).json({
    message: `${deletingUser.role} deleted successfully and reassigned where needed`,
  });
}),
get_staffs: asynchandler(async (req, res) => {

  // Fetch all Sub-Admins + Agents
  const staffs = await User.find({
    role: { $in: ["Sub-Admin", "Agent"] }
  })
    .populate("assignedAgents", "name")
    .populate("assignedTo", "name");

  // Build final response
  const staffData = await Promise.all(
    staffs.map(async (staff) => {

      // Fetch all leads related to this staff
      const leads = await User.find({
        role: "user",
        $or: [
          { assignedTo: staff._id },
          { createdBy: staff._id }
        ]
      }).select("name email status");

      const leadCount = leads.filter(
        (l) => l.status === "new" || l.status === "open"
      ).length;

      const followupCount = leads.filter(
        (l) => l.status === "open"
      ).length;

      return {
        _id: staff._id,
        name: staff.name,
        role: staff.role,
        email: staff.email,
        mobile: staff.mobile,

        assignedAgents: staff.assignedAgents,
        assignedTo: staff.assignedTo, // For Agent → Sub-Admin

        leads,          // list of leads for this staff
        leadCount,      // new + open
        followupCount,  // open leads only
      };
    })
  );

  res.status(200).json(staffData);
}),

get_all_agents: asynchandler(async (req, res) => {
    const agents = await User.find({ role: "Agent" });
    res.status(200).json(agents);
}),
  get_agents: asynchandler(async (req, res) => {
    const metadata = JSON.parse(req.headers["x-metadata"] || "{}");

    const metadataId = metadata._id;

    const filter = { role: "Agent" };

    if (metadataId) {
      filter.assignedTo = metadataId;
    }

    const agents = await User.find(filter);
    res.status(200).json(agents);
  }),

  change_password: asynchandler(async (req, res) => {
    const { id } = req.params;
    const { oldpassword, newpassword, confirmnewpassword } = req.body;

    const staffExist = await User.findById(id);
    if (!staffExist) {
      return res.status(400).json({ message: "Staff not found" });
    }

    const passwordMatch = await bcrypt.compare(
      oldpassword,
      staffExist.password
    );
    if (!passwordMatch) {
      return res.status(400).json({ message: "Old password is incorrect" });
    }

    if (oldpassword === newpassword) {
      return res.status(400).json({ message: "Enter a different password" });
    }

    if (newpassword !== confirmnewpassword) {
      return res.status(400).json({ message: "Password does not match" });
    }

    const hashvalidate = await bcrypt.hash(newpassword, 12);

    const changedPassword = await User.findByIdAndUpdate(
      id,
      { password: hashvalidate },
      { runValidators: true, new: true }
    );
    res.status(200).json({ message: "Password has been changed" });
  }),

  upload_profileImage: asynchandler(async (req, res) => {
    const userId = req.user?.id;
    const fileUrl = req.file.path;
    if (!fileUrl) {
      return res.status(400).json({ message: "No image uploaded" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { profileImage: fileUrl },
      { runValidators: true, new: true }
    );

    if (!updatedUser) {
      return res.status(400).json({ message: "Staff not found" });
    }

    res.status(200).json(updatedUser.profileImage);
  }),
};

module.exports = staffsController;
