
const express = require('express')
const cors = require('cors')
const connectDB = require('./database/connectDB')
require('dotenv').config()

const app = express()
const router = require('./routes/index')

connectDB()
require('./cron/followupnotifier')
app.use(express.json())
app.use(cors())
app.use(router)

const PORT = process.env.PORT || 5000;
app.listen(PORT,()=>{
    console.log(`Your server is running on ${PORT}`);
})