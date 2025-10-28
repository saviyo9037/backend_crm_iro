const { default: mongoose } = require("mongoose");

const taskSchema = new mongoose.Schema({
    name : {
        type:String
    },
    description : {
        type:String
    },
    createdBy : {
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    assignedTo : {
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    status :{
        type:String,
        enum : ['pending','completed'],
        default : 'pending'
    },
    updatedBy :{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User'
    },
    deadline : {
        type:Date
    }
},{timestamps : true})

const Task = mongoose.model('Task',taskSchema)
module.exports = Task