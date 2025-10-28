const asynchandler = require('express-async-handler')
require('dotenv').config()
const JWT = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const User = require('../models/userModel')

const staffsController = {
    register_staffs: asynchandler(async (req, res) => {
        const { name, email, mobile, role } = req.body;

        const existingSubadmin = await User.findOne({ email })
        if (existingSubadmin) {
            return res.status(400).json({ message: "Staff already exists" })
        }
        const mobileExist = await User.findOne({ mobile })
        if (mobileExist) {
            return res.status(400).json({ message: "Mobile number exists" })
        }

        const hashvalidate = await bcrypt.hash(mobile, 12)

        const newSubadmin = await User.create({
            name,
            email,
            mobile,
            password: hashvalidate,
            role,
        })

        const payload = {
            id: newSubadmin._id,
            name: newSubadmin.name
        }

        const token = JWT.sign(payload, process.env.JWT_SECRET_KEY)

        res.status(200).json({
            message: "Staff created successfully",
            token
        })

    }),

    edit_staffs: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { name, mobile, email } = req.body;

        const staff = await User.findById(id)
        if (!staff) {
            return res.status(400).json({ message: "Staff not found" })
        }
        const emailExists = await User.findOne({ email })
        if (emailExists) {
            return res.status(400).json({ message: "Email already exists" })
        }

        const mobileExists = await User.findOne({ mobile })
        if (mobileExists) {
            return res.status(400).json({ message: "Mobile already exists" })
        }

        if (name) {
            staff.name = name;
        }

        if (mobile) {
            staff.mobile = mobile;
        }

        if (email) {
            staff.email = email;
        }

        await staff.save()

        res.status(200).json({ staff })

    }),

    delete_staffs: asynchandler(async (req, res) => {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: "User id is required" })
        }

        const theMember = await User.findById(id)
        if (!theMember) {
            return res.status(400).json({ message: "User does not exist" })
        }

        await User.findByIdAndDelete(id)
        res.status(200).json({ message: "User deleted successfully" })
    }),

    get_staffs: asynchandler(async (req, res) => {
        const subadmins = await User.find({ role: { $in: ['Sub-Admin', 'Agent'] } }).populate('assignedAgents', 'name')
        res.status(200).json(subadmins)
    }),

    get_agents: asynchandler(async (req, res) => {

        const metadata = JSON.parse(req.headers['x-metadata'] || '{}')

        const metadataId = metadata._id

        const filter = { role: 'Agent' }

        if (metadataId) {
            filter.assignedTo = metadataId
        }

        const agents = await User.find(filter)
        res.status(200).json(agents)
    }),

    change_password: asynchandler(async (req, res) => {
        const { id } = req.params;
        const { oldpassword, newpassword, confirmnewpassword } = req.body;

        const staffExist = await User.findById(id)
        if (!staffExist) {
            return res.status(400).json({ message: "Staff not found" })
        }

        const passwordMatch = await bcrypt.compare(oldpassword, staffExist.password)
        if (!passwordMatch) {
            return res.status(400).json({ message: "Old password is incorrect" })
        }

        if (oldpassword === newpassword) {
            return res.status(400).json({ message: "Enter a different password" })
        }

        if (newpassword !== confirmnewpassword) {
            return res.status(400).json({ message: "Password does not match" })
        }

        const hashvalidate = await bcrypt.hash(newpassword, 12)

        const changedPassword = await User.findByIdAndUpdate(
            id,
            { password: hashvalidate },
            { runValidators: true, new: true }
        )
        res.status(200).json({ message: "Password has been changed" })

    }),

    upload_profileImage: asynchandler(async (req, res) => {
        const userId = req.user?.id
        const fileUrl = req.file.path
        if (!fileUrl) {
            return res.status(400).json({ message: "No image uploaded" })
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profileImage: fileUrl },
            { runValidators: true, new: true }
        )

        if (!updatedUser) {
            return res.status(400).json({ message: "Staff not found" })
        }

        res.status(200).json(updatedUser.profileImage)
    })
}

module.exports = staffsController