
const preventWriteforImpersoning = async(req,res,next)=>{
    if(req.originalUser){
        return res.status(400).json({message:"Only read operations are allowed"})
    }
    next()
}

module.exports = preventWriteforImpersoning