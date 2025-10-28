const Permission = require("../models/permissionModel");

const permissionController ={
    createPermission: async (req,res) => {
        try {
            const {title,active} = req.body;
            if(!title||!active){
                res.status(404).send("These fields are required")
            }
            const createPermission=await Permission.create({
                title,
                active
            })
            if(!createPermission){
                res.status(400).send("Permission is not created yet")
            }
            res.status(201).json({
                message:"Permission created successfully",
                createPermission
            })
        } catch (error) {
            res.status(500).json({
                message:"Internal server error",
                error:error.message
            })
        }
    },
    getPermission:async (req,res) => {
        try {
            const getPermission = await Permission.find({});
            if(!getPermission || getPermission.length === 0){
                res.status(404).send("No such permission found")
            }
            
            
            res.status(201).json({
                message:"Permission found",
                getPermission
            })
        } catch (error) {
            res.status(500).json({
                message:"Internal server error",
                error:error.message
            })
        }
    },
    updatePermission:async (req,res) => {
        try {
            const{ active }=req.body;
            const id = req.params
            const permissionFound = {active}

            if(!req.params){
                res.status(404).send("id not found")
            }
            
            const updatePermission=await Permission.findByIdAndUpdate(
                req.params.id,
                permissionFound,
                {new:true}
            )

            if(!updatePermission){
                res.status(400).send("Permisson is not updated")
            }

            res.status(200).json({
                message:"Permisson updated successfully",
                updatePermission
            })
        } catch (error) {
            res.status(500).json({
                message:"Internal server error",
                error:error.message
            })
        }
    },
    deletePermission:async (req,res) => {
        try {
            const deletePermission = await Permission.findByIdAndDelete(req.params.id);

            if(!deletePermission){
                res.status(404).send("Permission is not deleted yet")
            }

            res.status(201).json({
                message:"Permission deleted successfully",
                deletePermission
            })
        } catch (error) {
            res.status(500).json({
                message:"Internal server error",
                error:error.message
            })
        }
    }
}


module.exports = permissionController 


