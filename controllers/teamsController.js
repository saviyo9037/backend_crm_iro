const asynchandler = require('express-async-handler');
const User = require('../models/userModel');
const Notification = require('../models/notificationModel');

const teamsController = {
    assign_team: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { agentId } = req.body;

        const subadmin = await User.findById(id)
        if (!subadmin) {
            return res.status(400).json({ message: "Subadmin not found" })
        }

        const agent = await User.findById(agentId)
        if (!agent) {
            return res.status(400).json({ message: "Staff not found" })
        }

        const assignedteam = await User.findByIdAndUpdate(
            id,
            { $addToSet: { assignedAgents: agent._id } },
            { runValidators: true, new: true }
        )

        const assignedto = await User.findByIdAndUpdate(
            agentId,
            { assignedTo: id },
            { runValidators: true, new: true }
        )

        const admins = await User.find({ role: 'Admin' });
        const notifications = admins.map(admin => ({
            user: admin._id,
            title: 'Team Assigned',
            message: `Agent ${agent.name} has been assigned to Subadmin ${subadmin.name}`,
        }));

        notifications.push({
            user: subadmin._id,
            title: 'Team Assigned',
            message: `Agent ${agent.name} has been assigned to you`,
        });

        notifications.push({
            user: agent._id,
            title: 'Team Assigned',
            message: `You have been assigned to Subadmin ${subadmin.name}`,
        });

        await Notification.insertMany(notifications);

        res.status(200).json({ assignedteam, assignedto })
    }),

    unassign_team: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { agentId } = req.body;

        const subadmin = await User.findById(id)
        if (!subadmin) {
            return res.status(400).json({ message: "Subadmin not found" })
        }

        const agent = await User.findById(agentId)
        if (!agent) {
            return res.status(400).json({ message: "Staff not found" })
        }

        const unassignteam = await User.findByIdAndUpdate(
            id,
            { $pull: { assignedAgents: agent._id } },
            { runValidators: true, new: true }
        )

        const unassignedTo = await User.findByIdAndUpdate(
            agentId,
            { assignedTo: null },
            { runValidators: true, new: true }
        )

        const admins = await User.find({ role: 'Admin' });
        const notifications = admins.map(admin => ({
            user: admin._id,
            title: 'Team Unassigned',
            message: `Agent ${agent.name} has been unassigned from Subadmin ${subadmin.name}`,
        }));

        notifications.push({
            user: subadmin._id,
            title: 'Team Unassigned',
            message: `Agent ${agent.name} has been unassigned from you`,
        });

        notifications.push({
            user: agent._id,
            title: 'Team Unassigned',
            message: `You have been unassigned from Subadmin ${subadmin.name}`,
        });

        await Notification.insertMany(notifications);

        res.status(200).json({ unassignteam })

    }),
}

module.exports = teamsController