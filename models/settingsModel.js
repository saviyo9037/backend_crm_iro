const { default: mongoose } = require("mongoose");

const settingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  type: {
    type: String,
    enum: ['customer-status', 'documents', 'lead-sources', 'products','gst'],
    required: true,
  },
  amount: {
    type: Number,
    required: function () {
      return this.type === 'products';
    },
  },
  duration: {
    type: Number,
    default: 0,
    required: function () {
      return this.type === 'products';
  },
},
    gst_amount:{
        type:Number,
        
    }
}, { timestamps: true })

const Setting = mongoose.model('Setting',settingSchema)
module.exports = Setting