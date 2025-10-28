const asynchandler = require('express-async-handler');
const Setting = require('../../models/settingsModel');

const leadSourceSettingsController = {

    add: asynchandler(async (req, res) => {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ message: " Title is required " });
        }

        const leadSource = await Setting.create({
            title,
            active: true,
            type: 'lead-sources'
        })

        res.status(200).json({ message: "Lead source added successfully" })
    }),

    list: asynchandler(async (req, res) => {
        const getLeadsource = await Setting.find({ type: 'lead-sources' })
        res.status(200).json({ getLeadsource })
    }),

    edit: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { title } = req.body;
        
        const leadsourceExists = await Setting.findById(id)
        if (!leadsourceExists) {
            return res.status(400).json({ message: " Lead Source does not exists " });
        }

        const updatedLeadsource = await Setting.findByIdAndUpdate(
            id,
            { title },
            { runValidators: true, new: true }
        )

        res.status(200).json({ updatedLeadsource })
    }),

    delete: asynchandler(async (req, res) => {
        const { id } = req.params;

        const leadsourceExists = await Setting.findById(id)
        if (!leadsourceExists) {
            return res.status(400).json({ message: " Lead source does not exists " });
        }

        await Setting.findByIdAndDelete(id)
        res.status(200).json({ message: "Lead source deleted successfully" })
    }),

    update_active: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { active } = req.body;

        const source = await Setting.findById(id)
        if (!source) {
            return res.status(400).json({ message: " Lead source does not exists " });
        }

        const activatedSource = await Setting.findByIdAndUpdate(
            id,
            { active },
            { runValidators: true, new: true }
        )
        res.status(200).json({ activatedSource })
    })
}

module.exports = leadSourceSettingsController