const JWT = require('jsonwebtoken');
const User = require('../models/userModel');
require('dotenv').config()

const isAuth = (async (req, res, next) => {
    const token = req.headers['authorization']?.split(" ")[1];
    if (!token) {
        return res.status(401).json({ message: "Authorization Denied" });
    }

    const decoded = JWT.verify(token, process.env.JWT_SECRET_KEY);
    if (!decoded) {
        return res.status(401).json({ message: "Invalid token" });
    }

    // Fetch original user from DB
    const originalUser = await User.findById(decoded.id).select("-password");
    if (!originalUser) {
        return res.status(401).json({ message: "User not found" });
    }
    
    req.user = originalUser;

    // Check for impersonation
    if (req.headers['x-metadata']) {
        const metadataUser = JSON.parse(req.headers['x-metadata']);
        if (metadataUser?._id && originalUser.role === "Admin") {
            const impersonatedUser = await User.findById(metadataUser._id);
            if (impersonatedUser) {
                req.originalUser = originalUser;  // the admin
                req.user = impersonatedUser;      // the impersonated staff
            } else {
                console.log("Impersonation target user not found.");
            }
        }
    }
    next();
})

module.exports = isAuth;