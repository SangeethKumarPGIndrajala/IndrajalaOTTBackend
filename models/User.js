const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
    name: {
        type: String,
    },
    email: {
        type: String,
    },
    phonenumber: {
        type: String,
    },
    password: {
        type: String,
    },
    count: {
        type: Number,
        required: true,
        default: 0,
    },
    otpSendTime: {
        type: Date,
        default: Date.now,
    },
    forgot_otp: {
        type: Number,
        default: null,
    },
    likedList: {
        type: [String], // Array of String objects
        default: [],
    },
    watchLater: {
        type: [String], // Array of String objects
        default: [],
    },
    subscriptionType: {
        type: String, // Subscription type
        default: 'Free User', // Default subscription type
    },
    expiryDate: {
        type: Date, // Expiry date
        default: new Date('2024-08-29'), // Default expiry date set to 25th August 2024
    },
    
});

const User = mongoose.model('User', userSchema);
module.exports = { User };
