const mongoose = require("mongoose");

const carouselShema=mongoose.Schema({
    movieName: {
        type: String,
      
    },
   image: {
        type: String,
      
    },
   
})
const Carousels=mongoose.model('Users',carouselShema)
module.exports={Carousels}