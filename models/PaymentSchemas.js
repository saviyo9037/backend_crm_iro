const { default: mongoose } = require("mongoose");


const paymentSchemas = new mongoose.Schema({
    nextPaymentEscalatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required:true
    },
    nextPaymentDate: {
        type: Date
    },
    transactions:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transactions'
    }],
    totalAmount: {
        type: Number,
        required:true
    },
    totalPaid:{
        type: Number,
        required:true,
        default:0
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    }
}, { timestamps: true })


const Payments = mongoose.model('Payments', paymentSchemas)
module.exports = Payments