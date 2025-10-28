const asynchandler = require('express-async-handler');
require('dotenv').config()
const nodemailer = require('nodemailer');
const User = require('../models/userModel');
const bcrypt = require('bcryptjs');
const crypto = require('crypto')

const generatePin = () => crypto.randomInt(100000, 1000000).toString();

const passwordController = {
    forgot_password: asynchandler(async (req, res) => {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Email not found" });
        }
        
        const pin = generatePin();
        const expiresInMs = 10 * 60 * 1000; // 10 minutes
        const expiryTimestamp = Date.now() + expiresInMs;

        user.resetPin = pin;
        user.pinExpires = expiryTimestamp;
        await user.save(); // ✅ Save changes

        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE,
            auth: {
                user: process.env.TRANSPORTER_EMAIL,
                pass: process.env.TRANSPORTER_PASS
            }
        });

        await transporter.sendMail({
            from: process.env.TRANSPORTER_EMAIL,
            to: email,
            subject: 'Reset Password PIN',
            text: `Your reset pin is ${pin}. It will expire in 10 minutes.`
        });

        res.status(200).json({
            message: "Pin sent to email",
            expiresIn: Math.floor(expiresInMs / 1000) // e.g., 120 seconds
        });
    }),

    reset_password: asynchandler(async (req, res) => {
        const { email, pin, newpassword } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Email not found" });
        }

        if (user.resetPin !== pin) {
            return res.status(400).json({ message: "Invalid pin" });
        }

        if (Date.now() > user.pinExpires) {
            return res.status(400).json({ message: "Pin expired" });
        }

        user.password = await bcrypt.hash(newpassword, 12);
        user.resetPin = null;
        user.pinExpires = null;
        await user.save()

        res.status(200).json({ message: "Password reset successful" });
    })
};

module.exports = passwordController;
