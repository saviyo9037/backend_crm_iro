const asynchandler = require("express-async-handler");
const Followup = require("../models/followupModel");

const followupController = {
  add: asynchandler(async (req, res) => {
    const { leadId, description, createdBy } = req.body;

    if (!leadId || !description) {
      return res
        .status(400)
        .json({ message: "Lead ID and description are required" });
    }

    const followup = new Followup({
      leadId,
      description,
      createdBy,
      nextFollowUpDate: new Date(),
    });

    await followup.save();

    res.status(201).json(followup);
  }),
  show: asynchandler(async (req, res) => {
    const { leadId } = req.params;
    const followups = await Followup.find({ leadId })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    res.json(followups);
  }),
};

module.exports = followupController;
