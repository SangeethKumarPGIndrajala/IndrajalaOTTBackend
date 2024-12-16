
const mongoose = require('mongoose');
const adSchema = new mongoose.Schema({
    adTitle :{
        type: String,
        required:true
    },
    adURL:{
        type: String,
        required:true
    },
    clientName:{
        type: String,
        required:true
    },
    clientAddress:{
        type: String,
        required:true
    },
    clientContact:{
        type: String,
        required:true
    },
    clientEmail:{
        type: String
    },
    startDate:{
        type:String,
        required:true
    },
    endDate:{
        type:String,
        required:true
    },
    adPosition:{
        type:String,
        required:true
    },
    adMobileImage:{
        type:String,
        required:true
    },
    adDesktopImage:{
        type:String,
        required:true
    },
    adClickCount:{
        type:Number,
        default:0
    },
    adStatus:{
        type:String,
        default:"active"
    }
})

const Advertisement = mongoose.model('Advertisement', adSchema);
module.exports = Advertisement;