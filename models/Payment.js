const mongoose = require('mongoose');

const transactionDetailsSchema = new mongoose.Schema({
    transactionId: { type: String, required: true },
    method: { type: String, required: true }, // e.g., credit card, PayPal
    reference: { type: String }, // optional reference number
    // Add more fields as needed
}, { _id: false });

const paymentSchema = new mongoose.Schema({
    id: { type: Number, unique: true, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    status: { type: String, required: true }, // e.g., pending, completed, failed
    transactionDetails: transactionDetailsSchema
});

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
