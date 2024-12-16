const mongoose = require("mongoose");

const rateShema=mongoose.Schema({
    rating:{
     type: String,
    enum: ['U', 'U/A', 'A'],
    required: true
    },
   
   
})
const Rate=mongoose.model('Rates',rateShema)
module.exports={Rate}