const express = require("express");
const router = express.Router();
const paymentControll = require('../controllers/paymentControll');
const {userAuth}=require('../middleware/userAuth');



// PhonePe Payment Gateway
router.post('/phonepe',paymentControll.checkout);
router.get('/status/:txnID',paymentControll.checkStatus)   


//RazorPay PaymentGateway International
router.post('/createOrder',paymentControll.orderCreate);
router.post('/verifyPayment',paymentControll.verifyPayment);

//Razorpay Payment Gatway Indian
router.post('/newuser',paymentControll.newuser);
router.post('/checkstatus',paymentControll.checkPay);


module.exports = router