const asynchandler = require('express-async-handler');
const Leadform = require('../../models/leadformModel');
const { settings } = require('../../routes');
const Setting = require('../../models/settingsModel');

const leadFormFieldsSettingsController = {
    add: asynchandler(async (req, res) => {
        const { name, type, options } = req.body;

        // Validate options for 'choice' type
        if ((type === 'choice' || type==='checkbox' )&& (!options || !Array.isArray(options) || options.length === 0)) {
            return res.status(400).json({ message: "Options are required for dropdown type" });
        }

        const leadFormFields = await Leadform.create({
            name,
            type,
            options: (type === 'choice' || type==='checkbox') ? options : undefined, // Only include options for 'choice' type
            active: true
        });

        res.status(200).json({ message: "Lead Form created successfully", leadFormFields });
    }),

    list: asynchandler(async (req, res) => {
        const getLeadform = await Leadform.find()
        res.status(200).json({ getLeadform })
    }),

    edit: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { name, type, options } = req.body;

        const leadFormExists = await Leadform.findById(id);
        if (!leadFormExists) {
            return res.status(400).json({ message: "Lead form does not exists" });
        }

        // Validate options for 'choice' type
        if ((type === 'choice' || type==='checkbox') && (!options || !Array.isArray(options) || options.length === 0)) {
            return res.status(400).json({ message: "Options are required for dropdown type" });
        }

        leadFormExists.name = name || leadFormExists.name;
        leadFormExists.type = type || leadFormExists.type;
        leadFormExists.options = (type === 'choice'  || type==='checkbox')? options : undefined; // Update options only for 'choice'

        await leadFormExists.save();

        res.status(200).json({ message: "Lead form updated successfully", leadFormFields: leadFormExists });
    }),

    delete: asynchandler(async (req, res) => {
        const { id } = req.params;

        const leadFormExists = await Leadform.findById(id)
        if (!leadFormExists) {
            return res.status(400).json({ message: "Lead form does not exists" })
        }

        await Leadform.findByIdAndDelete(id)
        res.status(200).json({ message: "Lead form deleted successfully" })
    }),

    update_active: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { active } = req.body;

        const leadform = await Leadform.findById(id)
        if (!leadform) {
            return res.status(400).json({ message: "Lead form does not exists" })
        }

        const updatedActive = await Leadform.findByIdAndUpdate(
            id,
            { active },
            { runValidators: true, new: true }
        )

        res.status(200).json({ updatedActive })
    }),

    get_products:asynchandler(async(req,res)=>{
        const get_products= await Setting.find({type : "products"})

        if(!get_products){
            res.status(404).send("No products are available")
        }

        res.status(201).json({
            message:"products found",
            get_products
        })
    })
}

module.exports = leadFormFieldsSettingsController