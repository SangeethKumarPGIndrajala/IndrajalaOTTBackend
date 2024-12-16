const express = require("express");
const dotenv = require("dotenv").config();
const path = require('path');
const cors = require('cors'); // Import the cors package

const admin = require("./routes/adminRoutes");
const user = require("./routes/userRoutes");
const Payment = require("./routes/PaymentRoutes");

const db = require("./models/mongoose");

const app = express();

const port = process.env.PORT || 20000;

app.use(cors({
  origin: "*", // Set this to the exact domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // Specify the allowed methods
  credentials: true // Allow credentials if needed
}));

// Set limit for JSON body size
app.use(express.json({ limit: '1200gb' })); // Set limit to 2 GB

// Define routes
app.use("/api/admin", admin);
app.use("/api/user", user);
app.use("/api/pay", Payment);

// Serve static files
app.use('/public', express.static(path.join(__dirname, 'public')));


// Basic route
app.get("/", (req, res) => {
    res.send("Congratulations ! You Find a Easter Egg");
});

// Start the server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
