const asynchandler = require('express-async-handler');
const Setting = require('../../models/settingsModel');

const customerstatusSettingsController = {

    add: asynchandler(async (req, res) => {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ message: " Title is required " });
        }

        const status = await Setting.create({
            title,
            active: true,
            type: 'customer-status'
        })

        res.status(200).json({ message: "Customer status added successfully" })
    }),

    list: asynchandler(async (req, res) => {
        const getCustomerstatus = await Setting.find({ type: 'customer-status' })
        res.status(200).json({ getCustomerstatus })
    }),

    edit: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { title } = req.body;

        const statusExists = await Setting.findById(id)
        if (!statusExists) {
            return res.status(400).json({ message: " Status does not exists " });
        }

        const updatedStatus = await Setting.findByIdAndUpdate(
            id,
            { title },
            { runValidators: true, new: true }
        )

        res.status(200).json({ updatedStatus })
    }),

    delete: asynchandler(async (req, res) => {
        const { id } = req.params;

        const statusExists = await Setting.findById(id)
        if (!statusExists) {
            return res.status(400).json({ message: " Status does not exists " });
        }

        await Setting.findByIdAndDelete(id)
        res.status(200).json({ message: "Status deleted successfully" })
    }),

    update_active: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { active } = req.body;

        const customerstatus = await Setting.findById(id)
        if (!customerstatus) {
            return res.status(400).json({ message: " Customer status does not exists " });
        }

        const activatedStatus = await Setting.findByIdAndUpdate(
            id,
            { active },
            { runValidators: true, new: true }
        )
        res.status(200).json({ activatedStatus })
    })
}

module.exports = customerstatusSettingsController