const { default: mongoose } = require("mongoose");


const nextfollowupSchema = new mongoose.Schema({
    isnextfollowupActive: {
        type:Boolean,
        default: false
    }
},{timestamps:true})


const Nextfollowup = mongoose.model('Nextfollowup',nextfollowupSchema)
module.exports = Nextfollowup