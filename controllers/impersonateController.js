const asynchandler = require('express-async-handler');
const User = require('../models/userModel');

const impersonateController = {
    impersonate: asynchandler(async(req,res)=>{
        const { id:selecteduserId } = req.params;
        const loggedinuser = req.originalUser;

        if(!selecteduserId){
            return res.status(400).json({ message: 'Staff ID is required' });
        }
        

        if(loggedinuser.role !== 'Admin'){
            return res.status(400).json({ message: 'Not authorized to impersonate' });
        }

        const staff = await User.findById(selecteduserId)
        if(!staff){
            return res.status(400).json({ message: 'Staff not found' });
        }
        res.status(200).json({
            message:"Impersonation successfull",
            impersonateAs: {
                id: staff._id,
                email: staff.email,
                name: staff.name,
                role: staff.role
            }
        })
    })
}

module.exports = impersonateController