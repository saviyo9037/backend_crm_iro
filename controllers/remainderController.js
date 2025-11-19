const asynchandler = require("express-async-handler");
const Remainder = require("../models/remainderModel");


const remainderController = {
    add:asynchandler(async(req,res)=>{
        const {date,description} = req.body;

        if(!date||!description){
            res.status(404).send("All fields are required")
        }

        const add = await Remainder.create({
            date,
            description
        })

        if(!add){
            res.status(400).send("Remainder is not set")
        }

        res.status(200).json({
            message:"Remainder set successfully"
        })
    }),
    list:asynchandler(async(req,res)=>{
        const list = await Remainder.findById(req.params.id);

        if(!list){
            res.status(404).send("No such remainder found");
        }

        res.status(200).json({
            message:"Remainder found",
            list
        })
    }),
    update:asynchandler(async(req,res)=>{
        const {date,description}= req.body;

        const updateValue = {date,description}
        const update = await Remainder.findByIdAndUpdate(
            req.params.id,
            updateValue,
            {new:true}
        );

        if(!update){
            res.status(400).send("no updations")
        }

        res.status(200).json({
            message:"updated",
            update
        })


    }),
    deleteRemainder:asynchandler(async(req,res)=>{

        const deleteRemainder = await Remainder.findByIdAndDelete(req.params.id);

        if(!deleteRemainder){
            res.status(404).send("no deletions yet")
        }

        res.status(200).json({
            message:"Remainder deleted successfully",
            deleteRemainder
        })
    })
}

module.exports = remainderController;