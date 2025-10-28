const asynchandler = require('express-async-handler')
const mongoose = require('mongoose')
require('dotenv').config()

const connectDB = asynchandler(async()=>{
    await mongoose.connect(process.env.MONGO_URI)
    console.log("Database connected successfully"); 
})

module.exports = connectDB;