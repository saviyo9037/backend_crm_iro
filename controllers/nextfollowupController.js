const asynchandler = require('express-async-handler');
const Nextfollowup = require('../models/nextfollowupModel');

const nextfollowupController = {
    set_active: asynchandler(async (req, res) => {
        const setactive = await Nextfollowup.findOneAndUpdate(
            {},
            { isnextfollowupActive: true },
            { runValidators: true, new: true, upsert: true }
        );
        res.status(200).json({ message: 'Next Followup activated' });
    }),

    set_inactive: asynchandler(async (req, res) => {
        const setinactive = await Nextfollowup.findOneAndUpdate(
            {},
            { isnextfollowupActive: false },
            { runValidators: true, new: true, upsert: true }
        );
        res.status(200).json({ message: 'Next Followup deactivated' });
    }),

    get_setting: asynchandler(async (req, res) => {
        const setting = await Nextfollowup.findOne({})
        res.status(200).json({ setting })
    })
}


module.exports = nextfollowupController