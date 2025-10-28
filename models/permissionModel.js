const mongoose = require("mongoose")
const permissionSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    active:{
        type:Boolean,
        required:true,
        default:false
    }
});


const Permission = mongoose.model("permission",permissionSchema);
module.exports =Permission;