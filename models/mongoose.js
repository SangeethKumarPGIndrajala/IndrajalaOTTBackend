const mongoose = require("mongoose");
mongoose.set("strictQuery", false);


require("dotenv").config();
const url = process.env.mongoURL;

// url ="mongodb+srv://lijishaunni99:2w1Aw6goWWjlDTX6@cluster0.cxdp2mn.mongodb.net/"
mongoose.connect(url).then(()=>{
    console.log("Connection successfully");
})
.catch((err)=> console.log(err));