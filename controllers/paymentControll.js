const { Carousels } = require("../models/Carousels");
const { Movies } = require("../models/Movies");
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const bcrypt = require('bcrypt');
require('dotenv').config();
const axios = require('axios');
const CryptoJS = require('crypto-js');
const { sendPlanUpdateMail } = require('./adminController');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const Payment=require('../models/Payment');
const express = require('express');
const moment = require('moment');
const crypto=require('crypto');

const app = express();
app.use(bodyParser.json());


//Create a Instance of Razorpay
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAYID, 
  key_secret: process.env.RAZORPAYSEC
});




// Function to generate a unique transaction ID
function generateTranscId() {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const randomLetters = Array.from({ length: 3 }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  const randomNumbers = Math.floor(10000 + Math.random() * 90000); // Generates a random 5-digit number
  return 'INDTR' + Date.now() + randomLetters + randomNumbers;
}

const checkout = async (req, res) => {
  try {
      // Destructuring the required fields from the request body
      const { Token, PhoneNumber,OrderId } = req.body;
      

      // Validate the input data
      if ( !PhoneNumber ) {
          return res.status(400).json({ message: "Please Submit Phone Number." });
      }
      
      const decoded = jwt.verify(Token, process.env.SECRET); // Replace 'process.env.SECRET' with your JWT secret key

      const { userId } = decoded;

      // Find the user by userId
      const user = await User.findById(userId);
      

      // If the user does not exist, return an error response
      if (!user) {
          return res.status(404).json({ message: "User not found." });
      }

   
      // Extract name and email from the user record
      const { name, email } = user;

      // Set values to Name and Email variables
      const Name = name;
      const Email = email;
    

      // Generate a unique transaction ID
      const transactionId = generateTranscId();

      let Amount;
      
      switch (OrderId) {
          case 1:
              Amount = 299;
              break;
          case 2:
              Amount = 399;
              break;
          case 3:
              Amount = 599;
              break;
          case 4:
              Amount = 999;
              break;
          default:
              Amount = 299;
      }

      

      const paymentId = await Payment.countDocuments() + 1; // Simple counter for unique id

        const newPayment = new Payment({
            id: paymentId, // Ensure this is unique
            name: Name,
            email: Email,
            phoneNumber: PhoneNumber,
            amount: Amount,
            status: "Initiated",
            transactionDetails: {
                transactionId: transactionId,
                method: 'PAY_PAGE', // Example method, modify as needed
            },
        });

        await newPayment.save();


      // Prepare the payment data
      const data = {
          merchantId: process.env.MERCHANT_ID, 
          merchantTransactionId: transactionId,
          merchantUserId: 'MUID' + userId,
          name: Name,
          amount: Amount * 100,
          redirectUrl: `https://api.indrajala.in/api/pay/status/${transactionId}`,
          redirectMode: "GET",
          mobileNumber: PhoneNumber,
          paymentInstrument: {
              type: "PAY_PAGE",
          },
      };


      const payload = JSON.stringify(data);
      const payloadMain = Buffer.from(payload).toString("base64");

      const key = process.env.PHONEPAY_API_KEY;  // Use the key from .env
      const keyIndex = 1;
      const string = payloadMain + "/pg/v1/pay" + key;

      const sha256 = CryptoJS.SHA256(string).toString();
      const checksum = sha256 + "###" + keyIndex;


      const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay";
      const requestData = {
          method: "POST",
          url: prod_URL,
          headers: {
              accept: "application/json",
              "Content-Type": "application/json",
              "X-VERIFY": checksum,
          },
          data: {
              request: payloadMain,
          },
      };

      // Make the API request
      axios.request(requestData)
          .then(async function (response) {
              const phonePeTransactionId = response.data.transactionId;
              res.status(201).send({
                  msg: "Payment successful",
                  status: "success",
                  data: response.data,
                  phonePeTransactionId: phonePeTransactionId,
              });
              console.log("Payment API Response:", response.data);
          })
          .catch(function (error) {
              console.error("Payment API Error:", error.message);
              res.status(500).json({ msg: "Payment Failed", status: "error", error: error.message });
          });
  } catch (e) {
      console.error("Internal Server Error:", e.message);
      res.status(500).json({ msg: "Internal Server Error", status: "error", error: e.message });
  }
};


const checkStatus = async (req, res) => {
  try {
      const merchantTransactionId = req.params.txnID; // Access txnID from req.params
      const merchantId = process.env.MERCHANT_ID;
      const key = process.env.PHONEPAY_API_KEY;  // Use the key from .env

      const keyIndex = 1;
      const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + key;
      const sha256 = CryptoJS.SHA256(string).toString();
      const checksum = sha256 + "###" + keyIndex;

      const URL = `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${merchantTransactionId}`;

      const options = {
          method: 'GET',
          url: URL,
          headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
              'X-VERIFY': checksum,
              'X-MERCHANT-ID': merchantId,
          }
      };

      console.log("Status API Request Options:", options);

      // Make the API request
      const response = await axios.request(options);

      if (response.data.data.responseCode === 'SUCCESS') {
        try {
            // Find the payment record by merchantTransactionId and update the status
            const updatedPayment = await Payment.findOneAndUpdate(
                { 'transactionDetails.transactionId': merchantTransactionId }, // Adjusted query to match the document structure
                { status: 'Success' }, // Update the status to 'Success'
                { new: true } // Return the updated document
            );
    
            if (updatedPayment) {
                try {
                    const redirectUrl  = await updateUserSubscription(merchantTransactionId);
                    res.redirect(redirectUrl );
                } catch (error) {
                    console.error("Error processing subscription update:", error.message);
                        res.redirect('https://indrajala.in/Broke'); // Redirect to an error page
                }
            } else {
                return res.status(404).json({
                    msg: "Payment record not found.",
                    status: "error",
                });
            }
        } catch (error) {
            // console.error("Error updating payment record:", error.message);
            // return res.status(500).json({
            //     msg: "Error updating payment record.",
            //     status: "error",
            //     error: error.message,
            // });
            res.redirect('https://indrajala.in/Broke');
        }
    } else {
        // // Handle failure or pending case
        // console.log("Payment failed or pending.");
        // return res.status(400).json({ 
        //     msg: "Payment status failed or pending.", 
        //     status: "failed", 
        //     data: response.data 
        // });


        res.redirect('https://indrajala.in/Broke');
    }
    



  } catch (error) {
      console.error("Internal Server Error:", error.message);
      res.status(500).json({ msg: "Internal Server Error", status: "error", error: error.message });
  }
};




// Razor Pay Order Create Wala code -----------------Don't touch above or Below above Phone Pe  ..//

const orderCreate = async (req, res) => {
    const { Name, Email, PhoneNumber, Option } = req.body;
    let Amount = 375;  // Default amount

    // Adjust the amount based on the selected Option
   
    if (Option === 1) {
        Amount = 375;
    }
    else if (Option === 2) {
        Amount = 500;
    } 
    else if (Option === 3) {
        Amount = 750;
    } else if (Option === 4) {
        Amount = 1175;
    }

    const receiptId = generateTranscId();
    const user = await User.findOne({ email: Email });

    // If the user does not exist, return an error response
    if (!user) {
        return res.status(404).json({ message: "User not found." });
    }

    // Options sent to Razorpay for order creation
    const options = {
        amount: Amount * 100,  // Amount in the smallest currency unit (paise for INR, cents for USD)
        currency: "USD",       // Ensure the currency matches your Razorpay account settings
        receipt: receiptId,    // Unique receipt ID
    };

    // Saving the Transaction
    const paymentId = await Payment.countDocuments() + 1; // Simple counter for unique id

    const newPayment = new Payment({
        id: paymentId, // Ensure this is unique
        name: Name,
        email: Email,
        phoneNumber: PhoneNumber,
        amount: Amount,
        status: "Initiated",
        transactionDetails: {
            transactionId: receiptId,
            method: 'RAZOR PAY PAYMENT', // Example method, modify as needed
        },
    });

    await newPayment.save();

    try {
        // Create an order using Razorpay API
        const response = await razorpayInstance.orders.create(options);

        // Update the transactionId with the Razorpay order ID
        await Payment.findOneAndUpdate(
            { id: paymentId },
            { 
                'transactionDetails.transactionId': response.id,
                status: 'Order Created'
            }
        );

        // Respond with the order details
        
        res.status(200).json({
            message: "Order created successfully",
            orderId: response.id,
            amount: Amount,
            currency: options.currency,
            receipt: options.receipt
        });
    } catch (error) {
        // If there's an error, update the payment status
        await Payment.findOneAndUpdate(
            { id: paymentId },
            { status: 'Failed' }
        );

        console.error('Razorpay order creation error:', error);
        if (error.statusCode === 401) {
            console.log(razorpayInstance);
            res.status(401).json({ error: "Authentication failed. Please check your API keys." });
        } else {
            res.status(500).json({ error: "Failed to create the order." });
        }
    }
};






// Razor Pay Order Create Wala code For Indian Users.//

const newuser = async (req, res) => {
    const { Name, Email, PhoneNumber, Option } = req.body;
    let Amount = 299;  // Default amount

    // Adjust the amount based on the selected Option
  
    if (Option === 1) {
        Amount = 299;
    }
    else if (Option === 2) {
        Amount = 399;
    } 
    else if (Option === 3) {
        Amount = 599;
    } else if (Option === 4) {
        Amount = 999;
    }

    const receiptId = generateTranscId();
    const user = await User.findOne({ email: Email });

    // If the user does not exist, return an error response
    if (!user) {
        return res.status(404).json({ message: "User not found." });
    }

    // Options sent to Razorpay for order creation
    const options = {
        amount: Amount * 100,  // Amount in the smallest currency unit (paise for INR, cents for USD)
        currency: "INR",       // Ensure the currency matches your Razorpay account settings
        receipt: receiptId,    // Unique receipt ID
    };

    // Saving the Transaction
    const paymentId = await Payment.countDocuments() + 1; // Simple counter for unique id

    const newPayment = new Payment({
        id: paymentId, // Ensure this is unique
        name: Name,
        email: Email,
        phoneNumber: PhoneNumber,
        amount: Amount,
        status: "Initiated",
        transactionDetails: {
            transactionId: receiptId,
            method: 'RAZOR PAY PAYMENT', // Example method, modify as needed
        },
    });

    await newPayment.save();

    try {
        // Create an order using Razorpay API
        const response = await razorpayInstance.orders.create(options);

        // Update the transactionId with the Razorpay order ID
        await Payment.findOneAndUpdate(
            { id: paymentId },
            { 
                'transactionDetails.transactionId': response.id,
                status: 'Order Created'
            }
        );

        // Respond with the order details
        
        res.status(200).json({
            message: "Order created successfully",
            orderId: response.id,
            amount: Amount,
            currency: options.currency,
            receipt: options.receipt
        });
    } catch (error) {
        // If there's an error, update the payment status
        await Payment.findOneAndUpdate(
            { id: paymentId },
            { status: 'Failed' }
        );

        console.error('Razorpay order creation error:', error);
        if (error.statusCode === 401) {
            console.log(razorpayInstance);
            res.status(401).json({ error: "Authentication failed. Please check your API keys." });
        } else {
            res.status(500).json({ error: "Failed to create the order." });
        }
    }
};












// Razorpay Payment verify Wala Option For Non Indian

const verifyPayment = async (req, res) => {
    const { Order_ID, Payment_ID, Signature } = req.body;
    const SecretKey = process.env.RAZORPAYSEC;

    // Create a Hash Based Message Auth Code (HMAC)
    const hmac = crypto.createHmac("sha256", SecretKey);
    hmac.update(Order_ID + "|" + Payment_ID);
    const generatedSignature = hmac.digest("hex");

    if (generatedSignature === Signature) {
        try {
            // 1. Update Payment status to Success
            const payment = await Payment.findOneAndUpdate(
                { 'transactionDetails.transactionId': Order_ID },
                { 
                    status: 'Success',
                    'transactionDetails.paymentId': Payment_ID
                },
                { new: true }
            );

            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: "Payment record not found" 
                });
            }

            // 2. Fetch the Email and amount
            const { email, amount } = payment;

            // Determine subscription type and expiry date
            let subscriptionType, expiryDate;

            if (amount === 375) {
                subscriptionType = 'Basic';
                expiryDate = moment().add(15, 'days').toDate();
            }
            else if (amount === 500) {
                subscriptionType = 'Gold';
                expiryDate = moment().add(30, 'days').toDate();
            }
            
            else if (amount === 750) {
                subscriptionType = 'Standard';
                expiryDate = moment().add(60, 'days').toDate();

            } else if (amount === 1175) {
                subscriptionType = 'Platinum';
                expiryDate = moment().add(90, 'days').toDate();
            } else {
                return res.status(400).json({ 
                    success: false,
                    message: "Invalid amount for subscription" 
                });
            }

            // Update User subscription
            const updatedUser = await User.findOneAndUpdate(
                { email: email },
                {
                    subscriptionType: subscriptionType,
                    expiryDate: expiryDate
                },
                { new: true }
            );

            if (!updatedUser) {
                return res.status(404).json({ 
                    success: false,
                    message: "User not found" 
                });
            }

            await sendPlanUpdateMail(email, subscriptionType, expiryDate);

            
        
            res.status(200).json({ 
                success: true,
                message: "Payment verified and user updated successfully" 
            });
        } catch (error) {
            console.error("Error in payment verification:", error);
            res.status(500).json({ 
                success: false,
                message: "Internal server error during payment verification" 
            });
        }
    } else {
        res.status(400).json({ 
            success: false,
            message: "Payment verification failed" 
        });
    }
};




// Razorpay Payment verify Wala Option For  Indian

const checkPay = async (req, res) => {

    
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const SecretKey = process.env.RAZORPAYSEC;
   
    
    // Create a Hash Based Message Auth Code (HMAC)
    const hmac = crypto.createHmac("sha256", SecretKey);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generatedSignature = hmac.digest("hex");
    
    if (generatedSignature === razorpay_signature   ) {
        try {
           
            // 1. Update Payment status to Success
            const payment = await Payment.findOneAndUpdate(
                { 'transactionDetails.transactionId': razorpay_order_id },
                { 
                    status: 'Success',
                    'transactionDetails.paymentId': razorpay_order_id
                },
                { new: true }
            );

            if (!payment) {
                return res.status(404).json({ 
                    success: false,
                    message: "Payment record not found" 
                });
            }

            // 2. Fetch the Email and amount
            const { email, amount } = payment;

            // Determine subscription type and expiry date
            let subscriptionType, expiryDate;

            if (amount === 299) {
                subscriptionType = 'Basic';
                expiryDate = moment().add(15, 'days').toDate();
            }
            else if (amount === 399) {
                subscriptionType = 'Gold';
                expiryDate = moment().add(30, 'days').toDate();
            }
            
            else if (amount === 599) {
                subscriptionType = 'Standard';
                expiryDate = moment().add(60, 'days').toDate();

            } else if (amount === 999) {
                subscriptionType = 'Platinum';
                expiryDate = moment().add(90, 'days').toDate();
            } else {
                return res.status(400).json({ 
                    success: false,
                    message: "Invalid amount for subscription" 
                });
            }
           
            // Update User subscription
            const updatedUser = await User.findOneAndUpdate(
                { email: email },
                {
                    subscriptionType: subscriptionType,
                    expiryDate: expiryDate
                },
                { new: true }
            );
            

            if (!updatedUser) {
                return res.status(404).json({ 
                    success: false,
                    message: "User not found" 
                });
            }


            // 4. Send Plan Update Email to the User
            await sendPlanUpdateMail(email, subscriptionType, expiryDate);


      
             
            res.redirect(
                `https://indrajala.in/Home`
              );
        } catch (error) {
            console.error("Error in payment verification:", error);
          
           
            
            res.redirect(
                `https://indrajala.in/Broke`
              );
        }
    } else {
     
        
       
        res.redirect(
            `https://indrajala.in/Broke`
          );
    }
};




const updateUserSubscription = async (merchantTransactionId) => {
  try {
      // Fetch the payment record using the merchantTransactionId
      const paymentRecord = await Payment.findOne({
          'transactionDetails.transactionId': merchantTransactionId
      });

      // Check if the payment record exists
      if (!paymentRecord) {
          throw new Error("Payment record not found.");
      }

      // Extract the amount from the payment record
      const amount = paymentRecord.amount;

      // Determine subscription type and expiry date based on the amount
      let subscriptionType;
      let expiryDate;

      if (amount === 299) {
          subscriptionType = 'Baisc';
          expiryDate = moment().add(15, 'days').toDate(); // 15 days from today
      } else if (amount === 399) {
        subscriptionType = 'Gold';
        expiryDate = moment().add(30, 'days').toDate(); // 30 days from today
        }
      else if (amount === 599) {
          subscriptionType = 'Standard';
          expiryDate = moment().add(60, 'days').toDate(); // 30 days from today
      } else if (amount === 999) {
          subscriptionType = 'Platinum';
          expiryDate = moment().add(90, 'days').toDate(); // 60 days from today
      } else {
          throw new Error("Invalid amount for subscription.");
      }

      // Update the user's subscription type and expiry date
      const userEmail = paymentRecord.email; // Assuming email is stored in the payment record
    
      const updatedUser = await User.findOneAndUpdate(
                { email: userEmail }, // Find the user by email
            {
                    subscriptionType: subscriptionType,
                    expiryDate: expiryDate
            },
            

            { new: true } // This option ensures that the updated document is returned
            
        );
        

        if (updatedUser) {
            // Sign a JWT token with the user's ID
            const token = jwt.sign(
              { userId: updatedUser._id }, // Payload containing the user ID
              process.env.SECRET, // Secret key
              { expiresIn: '30d' } // Token expiry time (adjust as needed)
            );
          
           // Return the URL with token and expiry date
            return `https://indrajala.in/?jwt=${token}&exp=${expiryDate.toISOString()}`;

          } else {
             // Return the URL for unsuccessful update
                return 'https://indrajala.in/Broke';
          }
          

      console.log("User subscription updated successfully:", updatedUser);
      
  } catch (error) {
      console.error("Error updating user subscription:", error.message);
      throw error; // Rethrow the error for further handling
  }
};







module.exports = {
  checkout,   //PhonePe API Call function for Payment CheckOut
  checkStatus, //PhonePe API Status Function 


  orderCreate,   //Create Order Function - Razorpay  - Non Indian
  verifyPayment,     //PhonePe Verifiy Paymement Function Wala code 



  newuser,  //Create Order Function - Razorpay  - Indian
  checkPay  //PhonePe Verifiy Paymement Function Wala code 
  
};
