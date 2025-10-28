const asynchandler = require('express-async-handler');
const User = require('../models/userModel');
const Task = require('../models/taskModel');

const tasksController = {
    add: asynchandler(async (req, res) => {
        const { assignedTo, name, deadline, description } = req.body;

        const Id = req.user?.id
        const assignedUser = await User.findById(assignedTo)
        if (!assignedUser) {
            return res.status(400).json({ message: "Staff not found" })
        }

        const newtask = await Task.create({
            assignedTo,
            name,
            deadline,
            description,
            createdBy: Id,
            status: 'pending'
        })

        res.status(200).json({
            message: "Task created and assigned successfully",
            newtask
        })
    }),

    list: asynchandler(async (req, res) => {
        const task = await Task.find()
        res.status(200).json({ task })
    }),

    edit: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { assignedTo, name, deadline, description } = req.body;

        const task = await Task.findById(id)
        if (!task) {
            return res.status(400).json({ message: "Task not found" })
        }

        if (assignedTo) {
            task.assignedTo = assignedTo
        }
        if (name) {
            task.name = name
        }
        if (deadline) {
            task.deadline = deadline
        }
        if (description) {
            task.description = description
        }

        await task.save()
        res.status(200).json({ task })

    }),

    update_status: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const userId = req.user?.id
         
        if (!id) {
            return res.status(400).json({ message: "Task not found" })
        }

        const updatedTaskstatus = await Task.findByIdAndUpdate(
            id,
            { status, updatedBy: userId },
            { runValidators: true, new: true }
        )
        res.status(200).json({ updatedTaskstatus })
    })
}

module.exports = tasksController