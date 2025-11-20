const mongoose = require("mongoose")

const remainderSchema = new mongoose.Schema({
    date:{
        type:Date,
        required:true
    },
    description:{
        type:String,
        required:true
    }
})

const Remainder = mongoose.model("reminder",remainderSchema);

module.exports=Remainder;