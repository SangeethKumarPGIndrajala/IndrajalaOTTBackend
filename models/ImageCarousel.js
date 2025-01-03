const mongoose = require('mongoose');
const CarouselImage = new mongoose.Schema({
    title:{
        type: String,
        required: true
    },
    mobileImage:{
        type: String,
        required: true
    },
    desktopImage:{
        type: String,
        required: true
    },
    url:{
        type:String,
        required: true
    },
    description:{
        type: String,
        required: true
    }, 
    cast:{
        type: String,
        required: true
    },
    rating:{
        type: String,   
        required: true
    }
});

module.exports = mongoose.model('CarouselImage', CarouselImage);