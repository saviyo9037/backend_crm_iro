require('dotenv').config()
const asynchandler = require('express-async-handler')
const bcrypt = require('bcryptjs')
const JWT = require('jsonwebtoken')
const User = require('../models/userModel')

const createAdmin = {
    register_admin : asynchandler(async(req,res)=>{
        const {name,email,mobile,password} = req.body;

        const existingEmail = await User.findOne({ email })
                if (existingEmail) {
                    return res.status(400).json({ message: "Email id exists" })
                }
                const mobileExist = await User.findOne({ mobile })
                if (mobileExist) {
                    return res.status(400).json({ message: "Mobile number exists" })
                }

        const hashvalidate = await bcrypt.hash(password,12)

        const admin = await User.create({
            name,
            email,
            mobile,
            password: hashvalidate,
            role: 'Admin'
        })

        const payload = {
            id: admin._id,
            name: admin.name
        }

        const token = JWT.sign(payload,process.env.JWT_SECRET_KEY )

         res.status(200).json({
            message: "Admin created successfully",
            token
        })
    }),

    count_admin : asynchandler(async(req,res)=>{
        const count = await User.countDocuments({role:'Admin'})
        res.status(200).json({count})
    })
}

module.exports = createAdmin