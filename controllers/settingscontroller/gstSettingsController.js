const asynchandler = require('express-async-handler');
const Setting = require('../../models/settingsModel');

const gstSettingsController={
    createGst:asynchandler(async (req,res) => {
        const {gst_amount}= req.body

        if(!gst_amount){
            res.status(404).send("gst_amount is required")
        }

        const createGst = await Setting.create({
            active:true,
            type:'gst',
            gst_amount,
            title:"GST"
        })

        if(!createGst){
            res.status(400).send("gst is not created yet")
        }

        res.status(201).json({
            message:"gst created successfully",
            createGst
        })
    }),
    getGst: asynchandler(async (req, res) => {
        const getGst = await Setting.find({ type: 'gst' })
        res.status(200).json({ getGst })
    }),
    updateGst: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { gst_amount } = req.body;

        const gstExists = await Setting.findById(id)
        if (!gstExists) {
            return res.status(400).json({ message: " gst does not exists " });
        }

        const updateGst = await Setting.findByIdAndUpdate(
            id,
            { gst_amount },
            {  new: true }
        )

        res.status(200).json({ message:"gst updated",updateGst })
    }),
    update_active: asynchandler(async (req, res) => {
            const { id } = req.params;
            const { active } = req.body;
    
            const document = await Setting.findById(id)
            if (!document) {
                return res.status(400).json({ message: " gst does not exists " });
            }
    
            const update_active = await Setting.findByIdAndUpdate(
                id,
                { active },
                { runValidators: true, new: true }
            )
            res.status(200).json({ update_active })
        })

}

module.exports= gstSettingsController