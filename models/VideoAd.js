const mongoose = require('mongoose');
const VideoAdSchema = new mongoose.Schema({
    adTitle: {
        type:String,
        required:true
    },
    adType:{
        type:String,
        required:true
    },
    adURL:{
        type:String,
        required:true
    },
    adFrequency:{
        type:Number,
        default:0
    },
    status:{
        type:String,
        default:"active"
    },
    adRedirectURL:{
        type:String
    }
});

const VideoAd = mongoose.model('VideoAd', VideoAdSchema);

module.exports = VideoAd;