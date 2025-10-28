const asynchandler = require('express-async-handler');
const Setting = require('../../models/settingsModel');

const documentsSettingsController = {

    add: asynchandler(async (req, res) => {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ message: " Title is required " });
        }

        const status = await Setting.create({
            title,
            active: true,
            type: 'documents'
        })
        res.status(200).json({ message: "Document added successfully" })
    }),

    list: asynchandler(async (req, res) => {
        const getDocument = await Setting.find({ type: 'documents' })
        res.status(200).json({ getDocument })
    }),

    edit: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { title } = req.body;

        const documentExists = await Setting.findById(id)
        if (!documentExists) {
            return res.status(400).json({ message: " Document does not exists " });
        }

        const updatedDocument = await Setting.findByIdAndUpdate(
            id,
            { title },
            { runValidators: true, new: true }
        )

        res.status(200).json({ updatedDocument })
    }),

    delete: asynchandler(async (req, res) => {
        const { id } = req.params;

        const documentExists = await Setting.findById(id)
        if (!documentExists) {
            return res.status(400).json({ message: " Document does not exists " });
        }

        await Setting.findByIdAndDelete(id)
        res.status(200).json({ message: "Document deleted successfully" })
    }),

    update_active: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { active } = req.body;

        const document = await Setting.findById(id)
        if (!document) {
            return res.status(400).json({ message: " Document does not exists " });
        }

        const activatedDocument = await Setting.findByIdAndUpdate(
            id,
            { active },
            { runValidators: true, new: true }
        )
        res.status(200).json({ activatedDocument })
    })
}

module.exports = documentsSettingsController