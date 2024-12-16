const { Carousels } = require("../models/Carousels");
const { Movies } = require("../models/Movies");
const jwt = require('jsonwebtoken');
const {User} = require('../models/User');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');



const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(404).json({ message: "no data" })
        }
        else {
            const exist = await User.findOne({ email });
             if (exist) {
                console.log("error");
                return res.status(404).json({ message: "duplicate" });
            }
            const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Invalid email format." });
    }


            const hashedPassword = await bcrypt.hash(password, 10)
            const user = await User.create({ 
              name,
              email,
              password:hashedPassword })
            await user.save()

            const token = jwt.sign({ userId: user._id }, process.env.SECRET, { expiresIn: '30d' })
            res.status(200).json({ 
                token, 
                expiryDate: user.expiryDate 
            });

            return res.status(200).json({ message: "success" })
        }
    } catch (error) {
        console.log(error);
    }
}

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (email && password) {
            const user = await User.findOne({ email: email })
            if (!user) {
                return (
                    res.status(401).json({ error: "login failed" })
                )
            }
            const passwordMatch = await bcrypt.compare(password, user.password)
            if (!passwordMatch) {
                return res.status(401).json({ message: "no authentication" })
            }
            const token = jwt.sign({ userId: user._id }, process.env.SECRET, { expiresIn: '30d' })
             // Respond with the token and expiryDate
        res.status(200).json({ 
            token
        });
        } else {
            console.log("not found");
            res.status(404).json({ error: 'no data' })
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "login failed" })
    }
}






const getIndividualMovieDetails = async (req, res) => {
    try {
        const movieUrl = req.params.url; // Extract the URL parameter from the request

        // Find the movie by its URL, excluding the movieVideo and createdAt fields
        const movie = await Movies.findOne({ url: movieUrl }, '-movieVideo');

        // If the movie is not found, return a 404 error
        if (!movie) {
            return res.status(404).json({ error: "Movie not found" });
        }

        // Return the movie details in the response with a 200 status code
        res.status(200).json(movie);
    } catch (error) {
        console.error("Error fetching movie details:", error.message);
        // Return a 500 status code if there is a server error
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const profileDataBack = async (req, res) => {
    

        try {
          // Get the token from the request body
          const { token } = req.body;

    
          
          if (!token) {
            return res.status(400).json({ message: 'Token is required' });
          }
      
          // Decode the token to extract the user ID
          const decoded = jwt.verify(token, process.env.SECRET);
          const userId = decoded.userId;
    
          // Find the user in the database using the user ID
          const user = await User.findById(userId);

         
          
          if (!user) {
            return res.status(404).json({ message: 'User not found' });
          }
      
           // Select only the required fields to return
            const { name, email, subscriptionType, expiryDate } = user;

            // Return the selected user data with a 200 status code
            return res.status(200).json({ 
                name, 
                email, 
                subscriptionType, 
                expiryDate 
            });
          
        } catch (error) {
          console.error('Error decoding token or fetching user:', error);
          return res.status(500).json({ message: 'Internal server error' });
        }
     
};




const getVideoMovie = async (req, res) => {
    try {
        const movieUrl = req.params.url; // Extract the URL parameter from the request

        // Find the movie by its URL, excluding the movieVideo and createdAt fields
        const movie = await Movies.findOne({ url: movieUrl });

        // If the movie is not found, return a 404 error
        if (!movie) {
            return res.status(404).json({ error: "Movie not found" });
        }

        // Return the movie details in the response with a 200 status code
        res.status(200).json(movie);
    } catch (error) {
        console.error("Error fetching movie details:", error.message);
        // Return a 500 status code if there is a server error
        res.status(500).json({ error: "Internal Server Error" });
    }
};





const getIndividualMovieDetailsByID = async (req, res) => {
    try {
        const movieUrl = req.params.url; // Extract the URL parameter from the request

        // Find the movie by its URL, excluding the movieVideo and createdAt fields
        const movie = await Movies.findOne({ url: movieUrl }, '-movieVideo');

        // If the movie is not found, return a 404 error
        if (!movie) {
            return res.status(404).json({ error: "Movie not found" });
        }

        // Return the movie details in the response with a 200 status code
        res.status(200).json(movie);
    } catch (error) {
        console.error("Error fetching movie details:", error.message);
        // Return a 500 status code if there is a server error
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const checkexpValid = async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ message: "Token is required" });
        }

        // Verify and decode the token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.SECRET);
        } catch (error) {
            return res.status(401).json({ message: "Invalid or malformed token", error: error.message });
        }

        const userId = decoded.userId;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const today = new Date();
        const expiryDate = new Date(user.expiryDate);
        
        // Reset the time portion for both dates to compare only the day
        today.setHours(0, 0, 0, 0);
        expiryDate.setHours(0, 0, 0, 0);
        
        // Check if the expiry date is today or in the future
        const isValid = expiryDate.getTime() >= today.getTime(); // true if today or any upcoming date
        

        return res.status(200).json({ isValid });



    } catch (error) {
        console.error('Error decoding token or finding user:', error);
        return res.status(500).json({ message: "Server error", error: error.message });
    }
};


const getUserByEmail = async (email) => {
    try {
        // Query the database to find a user by email
        const user = await User.findOne({ email });
        
        // If no user is found, return null
        if (!user) {
            return null;
        }

        // Return the found user
        return user;
    } catch (error) {
        console.error('Error fetching user by email:', error);
        throw error; // Re-throw the error to be handled by the calling function
    }
};



const forgot = async (req, res) => {
    const { email } = req.body;
    
    try {
        // Fetch user by email
        const user = await getUserByEmail(email);
        
        
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // Generate a JWT token with the user's ID
        const token = jwt.sign({ id: user.id }, process.env.SECRET, { expiresIn: '10m' });
        
        // Create the reset link
        const resetLink = `https://indrajala.in/reset-password?token=${token}`;

        // Configure Nodemailer
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: true,
            auth: {
                user: process.env.SMAIL,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        // Email content
        const mailOptions = {
    from: `"Indrajala Movie Makers" <${process.env.SMAIL}>`,
    to: email,
    subject: 'Password Reset Request - Indrajala Movie Makers',
    html: `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <h2 style="color: #ff6347; text-align: left;">Reset Your Password</h2>
            <p style="text-align: left; line-height: 1.6;">
                Hello,
            </p>
            <p style="text-align: left; line-height: 1.6;">
                We received a request to reset your password for your Indrajala Movie Makers account. Please click the button below to proceed with resetting your password.
            </p>
            <p style="text-align: left; line-height: 1.6;">
                <a href="${resetLink}" style="display: inline-block; background-color: #ff6347; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin-top: 20px;">
                    Reset Password
                </a>
            </p>
            <p style="text-align: left; line-height: 1.6; margin-top: 20px;">
                <strong>Note:</strong> This link is valid for 10 minutes. If you did not request a password reset, please ignore this email or contact our support team for assistance.
            </p>
            <p style="text-align: left; line-height: 1.6; margin-top: 40px;">
                Thank you,<br/>
                <strong>The Indrajala Movie Makers Team</strong>
            </p>
            <p style="text-align: left; font-size: 12px; color: #999; margin-top: 30px;">
                Indrajala Movie Makers - OTT Platform for Your Fantasies<br/>
                If you need further assistance, please visit our <a href="https://policy.indrajala.in" style="color: #ff6347; text-decoration: none;">Support Page</a>.
            </p>
        </div>
    `,
};


        // Send the email
        await transporter.sendMail(mailOptions);

        // Respond to the user
        res.status(200).json({ message: 'Password reset link sent successfully.' });
    } catch (error) {
        console.error('Error in forgot password process:', error);
        res.status(500).json({ message: 'An error occurred while processing your request.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: 'Token and password are required' });
        }

        // Decrypt the token to get the user ID
        const decoded = jwt.verify(token, process.env.SECRET);
        const userId = decoded.id;

        // Hash the new password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update the user's password in the database
        await User.findByIdAndUpdate(userId, { password: hashedPassword });

        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Internal server error' });
    }
};



module.exports={
  
  register,
  login,
  getIndividualMovieDetails,
  getIndividualMovieDetailsByID,
  forgot,
  resetPassword,

  checkexpValid,   //check The Validity
  getVideoMovie,


  profileDataBack
  
}