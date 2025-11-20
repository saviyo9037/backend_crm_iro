const mongoose = require("mongoose");

const followupSchema = new mongoose.Schema(
  {
    leadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model (Lead)
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    nextFollowUpDate: {
      type: Date,
      // We will fetch this dynamically from the User model (no default)
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // The user (admin/agent) who created the follow-up
    },
  },
  { timestamps: true }
);

// 🔹 Pre-save middleware to automatically copy nextFollowUpDate from User
followupSchema.pre("save", async function (next) {
  try {
    if (this.leadId) {
      const User = mongoose.model("User");
      const user = await User.findById(this.leadId).select("nextFollowUp");
      if (user && user.nextFollowUp && user.nextFollowUp.length > 0) {
        // Get the latest nextFollowUpDate from the user
        const latestFollowup =
          user.nextFollowUp[user.nextFollowUp.length - 1];
        this.nextFollowUpDate = latestFollowup.nextFollowUpDate;
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Followup = mongoose.model("Followup", followupSchema);
module.exports = Followup;
