const asynchandler = require('express-async-handler');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const User = require('../models/userModel');

const loginController = {
    login: asynchandler(async (req, res) => {
        const { email, password } = req.body;

        const user = await User.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email" });
        }

        const comparepassword = await bcrypt.compare(password, user.password);

        if (!comparepassword) {
            return res.status(400).json({ message: "Invalid Password" });
        }

        const payload = {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            mobile: user.mobile,
            image: user.profileImage
        };

        const token = JWT.sign(payload, process.env.JWT_SECRET_KEY);

        res.status(200).json({
            message: `${user.role} Login successful`,
            token
            
        });
    })
};

module.exports = loginController;
