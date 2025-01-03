const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const nodemailer = require('nodemailer');
const jwtsecret = process.env.JWT_ADMIN_SECRET;
const { Movies } = require('../models/Movies');
const { Carousels } = require('../models/Carousels');
const Admin = require('../models/Admin');
const Payment=require('../models/Payment');
const {User} = require('../models/User');
const Recommendation = require('../models/Recommendation');
const Advertisement = require('../models/Advertisement');
const { error } = require('console');
const VideoAd = require('../models/VideoAd');
const ImageCarousel = require('../models/ImageCarousel');

const adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin by email
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare the password with the hashed password
        const isPasswordValid = await bcrypt.compare(password, admin.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign({ adminId: admin._id }, process.env.JWT_ADMIN_SECRET, { expiresIn: '1d' });
        return res.status(200).json({ token });
    } catch (error) {
        console.error("Error during admin login:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};

const addCarousels = async (req, res) => {
    try {
        const { movieName } = req.body;
        const imageObj = req.file;

        const carouselImage = await Carousels.create({
            movieName: movieName,
            image: `/carousel/${imageObj.filename}`
        });

        res.status(200).json(carouselImage);
    } catch (error) {
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const deleteCarousel = async (req, res) => {
    try {
        const carousel = await Carousels.findOneAndDelete({ _id: req.params.id });
        if (!carousel) {
            return res.status(404).json({ error: "Carousel not found" });
        }

        res.status(200).json({ msg: "Carousel removed" });
    } catch (error) {
        console.error("Error deleting carousel:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const movieDetails = async (req, res) => {
    try {
        const { movieName, description, starring, ageLimit, category, duration, url, rating } = req.body;
        const files = req.files;

        const movieFullImage = files['movieFullImage'] ? files['movieFullImage'][0].filename : null;
        const movieLogoImage = files['movieLogoImage'] ? files['movieLogoImage'][0].filename : null;
        const movieMobileImage = files['movieMobileImage'] ? files['movieMobileImage'][0].filename : null;
        const smallMovieImage = files['smallMovieImage'] ? files['smallMovieImage'][0].filename : null;
        const trailerVideo = files['trailerVideo'] ? files['trailerVideo'][0].filename : null;
        const movieVideo = files['movieVideo'] ? files['movieVideo'][0].filename : null;

        const movie = await Movies.create({
            movieName,
            description,
            starring,
            ageLimit,
            category,
            duration,
            rating,
            url,
            movieFullImage: movieFullImage ? `/movieImages/${movieFullImage}` : null,
            movieLogoImage: movieLogoImage ? `/movieImages/${movieLogoImage}` : null,
            movieMobileImage: movieMobileImage ? `/movieImages/${movieMobileImage}` : null,
            smallMovieImage: smallMovieImage ? `/movieImages/${smallMovieImage}` : null,
            trailerVideo: trailerVideo ? `/movieVideos/${trailerVideo}` : null,
            movieVideo: movieVideo ? `/movieVideos/${movieVideo}` : null
        });

        res.status(200).json(movie);
    } catch (error) {
        console.error("Error adding movie details:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Function to add videos along with movie details
const AddVideos = async (req, res) => {
  try {
      // Extract movie details from the request body
      const {
          movieName,
          description,
          starring,
          ageLimit,
          category,
          duration,
          rating,
          url,
      } = req.body;

      // Extract uploaded files from the request
      const files = req.files;

      // Get filenames from uploaded files
      const movieFullImage = files['movieFullImage'] ? files['movieFullImage'][0].filename : null;
      const movieLogoImage = files['movieLogoImage'] ? files['movieLogoImage'][0].filename : null;
      const movieMobileImage = files['movieMobileImage'] ? files['movieMobileImage'][0].filename : null;
      const smallMovieImage = files['smallMovieImage'] ? files['smallMovieImage'][0].filename : null;
      const trailerVideo = files['trailerVideo'] ? files['trailerVideo'][0].filename : null;
      const movieVideo = files['movieVideo'] ? files['movieVideo'][0].filename : null;

      // Create a new movie entry in the database
      const newMovie = await Movies.create({
          movieName,
          description,
          starring,
          ageLimit,
          category,
          duration,
          rating,
          url,
          movieFullImage: movieFullImage ? `/movieImage/${movieFullImage}` : null,
          movieLogoImage: movieLogoImage ? `/movieImage/${movieLogoImage}` : null,
          movieMobileImage: movieMobileImage ? `/movieImage/${movieMobileImage}` : null,
          smallMovieImage: smallMovieImage ? `/movieImage/${smallMovieImage}` : null,
          trailerVideo: trailerVideo ? `/movieImage/${trailerVideo}` : null,
          movieVideo: movieVideo ? `/movieImage/${movieVideo}` : null,
      });

      // Respond with the newly created movie entry
      res.status(200).json(newMovie);
  } catch (error) {
      console.error("Error adding movie:", error.message);
      res.status(500).json({ error: "Internal Server Error" });
  }
};

const videoStreams = async (req, res) => {
    try {
        const video = await Videos.findById(req.params.id);
        if (!video) {
            return res.status(404).send('Video not found');
        }

        const videoPath = path.join(__dirname, './public', req.params.filename);
        const videoStat = fs.statSync(videoPath);
        const fileSize = videoStat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (start >= fileSize) {
                res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
                return;
            }

            const chunksize = (end - start) + 1;
            const file = fs.createReadStream(videoPath, { start, end });
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            };

            res.writeHead(206, head);
            file.pipe(res);
        } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            };
            res.writeHead(200, head);
            fs.createReadStream(videoPath).pipe(res);
        }
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Add the controller for getting individual movie details
const getIndividualMovieDetails = async (req, res) => {
    try {
        const movieUrl = req.params.url;
        const movie = await Movies.findOne({ url: movieUrl }, '-movieVideo -createdAt');

        if (!movie) {
            return res.status(404).json({ error: "Movie not found" });
        }

        res.status(200).json(movie);
    } catch (error) {
        console.error("Error fetching movie details:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// The Corrosil Section Goes from Here. Now Only 3 Will be Listed if need Increase the count
const getLastThreeMovies = async (req, res) => {
    try {
        const movies = await Movies.find({}, 'movieFullImage description movieName year rating url category movieLogoImage smallMovieImage movieMobileImage')
            .sort({ createdAt: -1 });
            

        res.status(200).json(movies);
    } catch (error) {
        console.error("Error fetching latest movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


// The Function Will Return All Movies in the list -> The Primary use is to Admin Console Categroy Part
const getAllMovies = async (req, res) => {
    try {
        const movies = await Movies.find({}, ' description movieName year rating url category  movieMobileImage')
            .sort({ createdAt: -1 });
            

        res.status(200).json(movies);
    } catch (error) {
        console.error("Error fetching latest movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const viewTrendingMoviewList = async (req, res) => {
    try {
        // Get the category name from request parameters
        const category = "toptrendingmovies";

        // Find the recommendation with the given category name
        const recommendation = await Recommendation.findOne({ categoryName: category });

        // If no movies found for the given category
        if (!recommendation) {
            return res.status(404).json({ message: `No movies found under category ${category}` });
        }

        // Transform the movie data to include the required fields
        const formattedMovies = recommendation.movies.map(movie => ({
            _id: movie._id,
            movieName: movie.movieName,
            rating: movie.rating,
            description: movie.description,
            category: movie.category,
            url: movie.url,
            movieMobileImage: movie.movieMobileImage || '',
        }));

        // Return the formatted movies under the specified category
        res.status(200).json(formattedMovies);

    } catch (error) {
        console.error("Error fetching Top Five movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const viewTopFiveMoviesList = async (req, res) => {
    try {
        // Get the category name from request parameters
        const category = "topfivemovies";

        // Find the recommendation with the given category name
        const recommendation = await Recommendation.findOne({ categoryName: category });

        // If no movies found for the given category
        if (!recommendation) {
            return res.status(404).json({ message: `No movies found under category ${category}` });
        }

        // Transform the movie data to include the required fields
        const formattedMovies = recommendation.movies.map(movie => ({
            _id: movie._id,
            movieName: movie.movieName,
            rating: movie.rating,
            description: movie.description,
            category: movie.category,
            url: movie.url,
            movieMobileImage: movie.movieMobileImage || '',
        }));

        // Return the formatted movies under the specified category
        res.status(200).json(formattedMovies);

    } catch (error) {
        console.error("Error fetching Top Five movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};




const viewTopTrendingMovies = async (req, res) => {
    try {

        // Get the category name from request parameters
        const category = "toptrendingmovies";

        // Find the recommendation with the given category name
        const recommendation = await Recommendation.findOne({ categoryName: category });

        // If no movies found for the given category
        if (!recommendation) {
            return res.status(404).json({ message: `No movies found under category ${category}` });
        }

        // Return the movies under the specified category
        res.status(200).json({
          
            movies: recommendation.movies,
        });


    } catch (error) {
        console.error("Error fetching Top Five  movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const viewTopFiveMovies = async (req, res) => {
    try {

        // Get the category name from request parameters
        const category = "topfivemovies";

        // Find the recommendation with the given category name
        const recommendation = await Recommendation.findOne({ categoryName: category });

        // If no movies found for the given category
        if (!recommendation) {
            return res.status(404).json({ message: `No movies found under category ${category}` });
        }

        // Return the movies under the specified category
        res.status(200).json({
          
            movies: recommendation.movies,
        });


    } catch (error) {
        console.error("Error fetching Top Five  movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};



const addToRecomendationList = async (req, res) => {
    try {
        const { movieID, cat } = req.body;

        // Determine the category based on 'cat'
        let categoryName;
        if (cat === 1) {
            categoryName = 'topfivemovies';
        } else if (cat === 2) {
            categoryName = 'toptrendingmovies';
        } else {
            categoryName = 'topfivemovies'; // Default category if 'cat' is not 1 or 2
        }

        // Find the movie that needs to be added
        const movie = await Movies.findById(movieID);
        if (!movie) {
            return res.status(404).json({ error: "Movie not found" });
        }

        // Check if a recommendation for the category already exists
        let recommendation = await Recommendation.findOne({ categoryName });

        if (recommendation) {
            // Ensure the movie isn't already in this category
            const isMovieInCategory = recommendation.movies.some(
                (m) => m.movieName === movie.movieName
            );

            if (!isMovieInCategory) {
                // Add the movie to the existing recommendation
                recommendation.movies.push({
                    movieName: movie.movieName,
                    year: movie.year,
                    rating: movie.rating,
                    ageLimit: movie.ageLimit,
                    description: movie.description,
                    duration: movie.duration,
                    starring: movie.starring,
                    category: movie.category,
                    url: movie.url,
                    movieMobileImage: movie.movieMobileImage,
                });
                await recommendation.save();
                return res.status(201).json({ message: "Movie added successfully to the category" });
            } else {
                return res.status(400).json({ error: "Movie is already in this category" });
            }
        } else {
            // Create a new recommendation if not found
            const newRecommendation = new Recommendation({
                categoryName,
                movies: [{
                    movieName: movie.movieName,
                    year: movie.year,
                    rating: movie.rating,
                    ageLimit: movie.ageLimit,
                    description: movie.description,
                    duration: movie.duration,
                    starring: movie.starring,
                    category: movie.category,
                    url: movie.url,
                    movieMobileImage: movie.movieMobileImage,
                }],
            });
            await newRecommendation.save();
            return res.status(201).json({ message: "Movie added successfully to the new category" });
        }
    } catch (error) {
        // Error handling
        console.error("Error Adding Movie to category:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const returnHover = async (req, res) => {
    try {
        const movies = await Movies.find({}, 'movieFullImage description movieName year rating url category movieLogoImage smallMovieImage movieMobileImage')
                    .sort({ createdAt: -1 })
                    .limit(5);  // Limit the result to 1 movie

            

        res.status(200).json(movies);
    } catch (error) {
        console.error("Error fetching latest movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const getHowerMovieList = async (req, res) => {
    try {
        const movies = await Movies.find({}, 'movieFullImage description movieName year rating url category movieLogoImage trailerVideo')
            .sort({ createdAt: -1 })
            .limit(5);

        res.status(200).json(movies);
    } catch (error) {
        console.error("Error fetching latest movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

const createList = async (req, res) => {
    const { name, items } = req.body;

    try {
        // Check if the name already exists
        const existingList = await Recommendation.findOne({ name });
        if (existingList) {
            return res.status(400).json({ message: 'List with this name already exists' });
        }

        

        // Create a new list
        const newList = new Recommendation({
            name,
            items
        });

        // Save the new list to the database
        await newList.save();

        res.status(201).json({ message: 'List created successfully', newList });
    } catch (error) {
        console.error('Error creating list:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



const fetchAllMovies = async (req, res) => {
    try {
        const movies = await Movies.find({}, '-__v'); // Exclude the __v field if you want

        if (movies.length === 0) {
            return res.status(404).json({ message: "No movies found" });
        }

        res.status(200).json(movies);
    } catch (error) {
        console.error("Error fetching all movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const getIndividualMovieById = async (req, res) => {
    try {
        const { id } = req.params; // Get the movie ID from the request parameters

        // Find the movie by ID
        const movie = await Movies.findById(id);
        if (!movie) {
            return res.status(404).json({ error: "Movie not found" });
        }

        // Return the movie details
        res.status(200).json(movie);
    } catch (error) {
        console.error("Error fetching movie details:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


const getIndividualMovieDelete = async (req, res) => {
    const { id } = req.params;

    try {
        const deletedMovie = await Movies.findByIdAndDelete(id);

        if (!deletedMovie) {
            return res.status(404).json({ error: 'Movie not found' });
        }

        res.status(200).json({ message: 'Movie deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to delete movie' });
    }
};



const deleteList = async (req, res) => {
    const { name } = req.body; // Expecting the list name to be passed in the request body

    // Log the received body for debugging
    console.log('Received body:', req.body);

    try {
        // Find and delete the list by name
        const deletedList = await Recommendation.findOneAndDelete({ name });

        // Check if the list was found and deleted
        if (!deletedList) {
            return res.status(404).json({ message: 'List not found' });
        }

        res.status(200).json({ message: 'List deleted successfully', deletedList });
    } catch (error) {
        console.error('Error deleting list:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const addItems = async (req, res) => {
    const { name, items } = req.body;

    // Basic validation
    if (!name || !Array.isArray(items)) {
        return res.status(400).json({ message: 'Invalid input: name and items are required' });
    }

    try {
        // Find the list by name
        const list = await Recommendation.findOne({ name });

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Add the new items to the existing items array
        // Optionally handle duplicates
        list.items = [...new Set([...list.items, ...items])];

        // Save the updated list
        await list.save();

        res.status(200).json({ message: 'Items added successfully', list });
    } catch (error) {
        console.error('Error adding items:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const removeItems = async (req, res) => {
    const { name, items } = req.body;

    // Basic validation
    if (!name || !Array.isArray(items)) {
        return res.status(400).json({ message: 'Invalid input: name and items are required' });
    }

    try {
        // Find the list by name
        const list = await Recommendation.findOne({ name });

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Remove the specified items from the existing items array
        list.items = list.items.filter(item => !items.includes(item));

        // Save the updated list
        await list.save();

        res.status(200).json({ message: 'Items removed successfully', list });
    } catch (error) {
        console.error('Error removing items:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const fetchMovieDetailsByRecommendationName = async (req, res) => {
    const { name } = req.body;

    // Basic validation
    if (!name) {
        return res.status(400).json({ message: 'Invalid input: name is required' });
    }

    try {
        // Find the Recommendation list by name
        const recommendation = await Recommendation.findOne({ name });

        if (!recommendation) {
            return res.status(404).json({ message: 'Recommendation list not found' });
        }

        // Fetch movie details for the IDs in the recommendation list
        const movieIds = recommendation.items; // Assuming items field contains movie IDs
        if (!Array.isArray(movieIds) || movieIds.length === 0) {
            return res.status(404).json({ message: 'No movies found in the recommendation list' });
        }

        // Fetch movies from the database
        const movies = await Movies.find({ '_id': { $in: movieIds } });

        // Map the result to extract relevant details
        const movieDetails = movies.map(movie => ({
            name: movie.movieName,
            description: movie.description,
            category: movie.category,
            url: movie.url
        }));

        res.status(200).json({ message: 'Movie details fetched successfully', movies: movieDetails });
    } catch (error) {
        console.error('Error fetching movie details by recommendation name:', error.message);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};




const searchUserByMail = async (req, res) => {
    try {
        const { email } = req.body; // Extract email from request body
        
        // Check if email is provided
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        // Search for the user by email
        const user = await User.findOne({ email });

        // If user not found, return a 404 response
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Respond with the user's details (excluding sensitive info like password)
        return res.status(200).json({
            name: user.name,
            email: user.email,
            subscriptionType: user.subscriptionType,
            expiryDate: user.expiryDate,
            phoneNumber: user.phonenumber, // Return the updated phone number
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};



const updateUserPlan = async (req, res) => {
    try {
        const { email, selection } = req.body; // Extract email and selection from request body

        // Check if email and selection are provided
        if (!email || !selection) {
            return res.status(400).json({ message: "Email and selection are required" });
        }

        // Calculate the expiry date based on the selection
        let expiryDays;
        let subscriptionType;

        switch (selection) {
            case 'A':
                subscriptionType = 'Basic User';
                expiryDays = 15;
                break;
            case 'B':
                subscriptionType = 'Golden User';
                expiryDays = 30;
                break;
            case 'C':
                subscriptionType = 'Standard User';
                expiryDays = 60;
                break;
            case 'D':
                subscriptionType = 'Premium User';
                expiryDays = 90;
                break;
            default:
                return res.status(400).json({ message: "Invalid selection" });
        }

        // Calculate the new expiry date
        const newExpiryDate = new Date();
        newExpiryDate.setDate(newExpiryDate.getDate() + expiryDays);

        // Update the user's subscription type and expiry date
        const updatedUser = await User.findOneAndUpdate(
            { email }, 
            { 
                subscriptionType,
                expiryDate: newExpiryDate 
            },
            { new: true } // To return the updated document
        );

        // If user not found, return a 404 response
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        // Send email notification about the plan update
        await sendPlanUpdateMail(email, subscriptionType, newExpiryDate);

        // Respond with the updated user details
        return res.status(200).json({
            message: "User plan updated successfully",
            subscriptionType: updatedUser.subscriptionType,
            expiryDate: updatedUser.expiryDate
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};




const searchUserByPhoneNo = async (req, res) => {
    try {
        const { phoneNumber } = req.body; // Extract phone number and new phone number from the request body

        // Check if phone number is provided
        if (!phoneNumber) {
            return res.status(400).json({ message: "Phone number is required" });
        }

        // Find the latest payment record by phone number (sorted by most recent date)
        const lastPayment = await Payment.findOne({ phoneNumber }).sort({ date: -1 });

        // If payment not found, return a 404 response
        if (!lastPayment) {
            return res.status(404).json({ message: "No payment record found for this phone number" });
        }

        // Get the user's email from the last payment record
        const { email } = lastPayment;

        // Find the user by email from the User model
        const user = await User.findOne({ email });

        // If user not found, return a 404 response
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Update the payment status to "Success" for the last payment record
        lastPayment.status = "Success";
        await lastPayment.save(); // Save the updated payment record

        // Update the user's phone number with the  phone number From Payment Record
        user.phonenumber = phoneNumber;
        await user.save(); // Save the updated user record

        // Respond with the user's details and confirmation of the updates
        return res.status(200).json({
            name: user.name,
            email: user.email,
            subscriptionType: user.subscriptionType,
            expiryDate: user.expiryDate,
            phoneNumber: user.phonenumber, // Return the updated phone number
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};






const sendPlanUpdateMail = async (email, subscriptionType, expiryDate) => {
    try {
        // Create the Nodemailer transporter
        const transporter = nodemailer.createTransport({
            host: process.env.MAIL_HOST,
            port: process.env.MAIL_PORT,
            secure: true, // For SSL
            auth: {
                user: process.env.SMAIL,
                pass: process.env.MAIL_PASSWORD,
            },
        });

        // Email content
        const mailOptions = {
            from: `"Indrajala Movie Makers" <${process.env.SMAIL}>`,
            to: email,
            subject: 'Your Account Plan Has Been Updated',
            html: `
                <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #ff6347; text-align: left;">Account Plan Updated</h2>
                    <p style="text-align: left; line-height: 1.6;">
                        Hello,
                    </p>
                    <p style="text-align: left; line-height: 1.6;">
                        We are happy to inform you that your Indrajala Movie Makers account plan has been updated successfully. Below are the details of your updated subscription plan:
                    </p>
                    <p style="text-align: left; line-height: 1.6;">
                        <strong>Subscription Type:</strong> ${subscriptionType}<br/>
                        <strong>Expiry Date:</strong> ${expiryDate.toDateString()}
                    </p>
                    <p style="text-align: left; line-height: 1.6;">
                        If you did not make this request, please contact our support team immediately.
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
        
    } catch (error) {
        console.error('Error sending plan update email:', error);
    }
};


const removeFromTopFive = async (req, res) => {
    try {

        const { movieID } = req.body;

        // Define the category name to remove the movie from
        const categoryName = 'topfivemovies';

        // Find the recommendation for 'topfivemovies'
        const recommendation = await Recommendation.findOne({ categoryName });

        if (!recommendation) {
            return res.status(404).json({ error: "Top Five Movies list not found" });
        }

        // Find the index of the movie in the topfivemovies list
        const movieIndex = recommendation.movies.findIndex(
            (movie) => movie._id.toString() === movieID
        );

        if (movieIndex === -1) {
            return res.status(404).json({ error: "Movie not found in Top Five list" });
        }

        // Remove the movie from the array
        recommendation.movies.splice(movieIndex, 1);

        // Save the updated recommendation
        await recommendation.save();

        // Respond with success message
        res.status(200).json({ message: "Movie removed from Top Five Movies successfully" });


    } catch (error) {
        console.error("Error Removing Movie From Top Five  movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};


// This Part of code removes the movie from the list of top trending category
const removeFromTrending = async (req, res) => {
    try {

        const { movieID } = req.body;

        // Define the category name to remove the movie from
        const categoryName = 'toptrendingmovies';

        // Find the recommendation for 'topfivemovies'
        const recommendation = await Recommendation.findOne({ categoryName });

        if (!recommendation) {
            return res.status(404).json({ error: "Top Five Movies list not found" });
        }

        // Find the index of the movie in the topfivemovies list
        const movieIndex = recommendation.movies.findIndex(
            (movie) => movie._id.toString() === movieID
        );

        if (movieIndex === -1) {
            return res.status(404).json({ error: "Movie not found in Top Five list" });
        }

        // Remove the movie from the array
        recommendation.movies.splice(movieIndex, 1);

        // Save the updated recommendation
        await recommendation.save();

        // Respond with success message
        res.status(200).json({ message: "Movie removed from Top Five Movies successfully" });


    } catch (error) {
        console.error("Error Removing Movie From Top Five  movies:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// Advertisement management controllers from here

// Advertisement adding controller 
const addAdvertisement = async (req, res)=>{
    try{
        const {title, url, clientName, clientAddress, clientContact, startDate, endDate, adPosition} = req.body;
        const files = req.files;
        const mobileImage = files['mobileImage']? files['mobileImage'][0].filename : null;
        const desktopImage = files['desktopImage']? files['desktopImage'][0].filename : null;
        const advertisement = new Advertisement({
            adTitle: title,
            adURL: url,
            clientName: clientName,
            clientAddress: clientAddress,
            clientContact: clientContact,
            startDate: startDate,
            endDate: endDate,
            adPosition: adPosition,
            adMobileImage: mobileImage ? `/adImages/${mobileImage}` : null,
            adDesktopImage: desktopImage ? `/adImages/${desktopImage}` : null,
        });
        await advertisement.save();
        res.status(200).json({
            message: "Advertisement added successfully",
            advertisement: advertisement
        });
    }catch(error){
        console.error("Error Adding Advertisement:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Advertisement fetching controller for carousel
const fetchAdvertisementForCarousels = async(req, res)=>{
    try {
        const trendingAd = await Advertisement.find({adPosition: "trending", adStatus: "active"}).sort({_id: -1}).limit(5);
        const upcomingAd = await Advertisement.find({adPosition: "upcoming", adStatus: "active"}).sort({_id: -1}).limit(5);
        const topFiveAd = await Advertisement.find({adPosition: "topfive", adStatus: "active"}).sort({_id: -1}).limit(5);
        const advertisements = {
            trendingAd: trendingAd,
            upcomingAd: upcomingAd,
            topFiveAd: topFiveAd
        }
        res.status(200).json({
            message: "Advertisements fetched successfully",
            advertisements: advertisements
        });
    } catch (error) {
        console.error("Error Fetching Advertisement:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// Advertisement fetching controller for CDN
const fetchAdvertisements = async(req, res)=>{
    try {
        const advertisements = await Advertisement.find().sort({_id: -1});
        res.status(200).json({
            message: "Advertisements fetched successfully",
            advertisements: advertisements
        });
    } catch (error) {
        console.error("Error Fetching Advertisement:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// change advertisement status controller
const changeAdvertisementStatus = async(req, res)=>{
    try {
        const { adId, status } = req.body;
        const ad = await Advertisement.findById(adId);
        if(!ad){
            return res.status(404).json({ error: "Advertisement not found" });
        }
        ad.adStatus = status;
        await ad.save();
        res.status(200).json({
            message: "Advertisement status changed successfully",
            adStatus: ad.adStatus
        });
    } catch (error) {
        console.error("Error Changing Advertisement Status:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// handle adclick controller
const handleAdClick = async(req, res)=>{
    try {
        const {adId} = req.body;
        const ad = await Advertisement.findById(adId);
        if(!ad){
            return res.status(404).json({ error: "Advertisement not found" });
        }
        if(ad.adURL){
            ad.adClickCount += 1;
            await ad.save();
            res.status(200).json({
                message: "Advertisement clicked successfully",
                adURL: ad.adURL
            })
        }else{
            res.status(404).json({
                error:"Advertisement URL not found",
                adURL: null
            })
        }
    } catch (error) {
        console.error("Error Handling Ad Click:", error.message);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// handling ad videos
// add advertisement video controller
const addAdvertisementVideo = async(req, res)=>{
    try {
        const {title, adType} = req.body;
        const adRedirectURL = req.body.adRedirectURL ? req.body.adRedirectURL : null;
        const files = req.files;
        const video = files['adVideo'] ? files['adVideo'][0].filename : null;
        const videoAd =  new VideoAd({
            adTitle: title,
            adType: adType,
            adURL: video ? `/adVideos/${video}`:null,
            adRedirectURL: adRedirectURL,
        });
        await videoAd.save();
        res.status(200).json({
            message: "Advertisement Video added successfully",
        });
    } catch (error) {
        console.log("Error Adding Advertisement Video:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// fetch random trailer advertisements videos controller
const fetchRandomTrailerAdvertisements = async(req, res)=>{
    try {
        const trailerAdvertisemets = await VideoAd.find({adType: "trailer", status: "active"}).sort({_id: -1});
        if(trailerAdvertisemets.length === 0){
            return res.status(404).json({ error: "No Trailer Advertisements found" });
        }
        const randomTrailerAd = trailerAdvertisemets[Math.floor(Math.random() * trailerAdvertisemets.length)];
        await VideoAd.findByIdAndUpdate(randomTrailerAd._id, {adFrequency: randomTrailerAd.adFrequency + 1});
        res.status(200).json({
            message: "Random Trailer Advertisement fetched successfully",
            randomTrailerAd: randomTrailerAd
        });
    } catch (error) {
        console.log("Error Fetching Trailer Advertisements:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// fetch random full-video advertisements videos controller
const fetchRandomFullVideoAdvertisements = async(req, res)=>{
    try {
        const fullVideoAdvertisements = await VideoAd.find({adType: "full-length", status: "active"}).sort({_id: -1});
        if(fullVideoAdvertisements.length === 0){
            return res.status(404).json({ error: "No Full-Video Advertisements found" });
        }
        const randomFullVideoAd = fullVideoAdvertisements[Math.floor(Math.random() * fullVideoAdvertisements.length)];
        await VideoAd.findByIdAndUpdate(randomFullVideoAd._id, {adFrequency: randomFullVideoAd.adFrequency + 1});
        res.status(200).json({
            message: "Random Full-Video Advertisement fetched successfully",
            randomFullVideoAd: randomFullVideoAd
        });
    } catch (error) {
        console.log("Error Fetching Full-Video Advertisements:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// get all video advertisements controller
const getAllVideoAdvertisements = async(req, res)=>{
    try {
        const allVideoAdvertisements = await VideoAd.find().sort({_id: -1});
        res.status(200).json({
            message: "All Video Advertisements fetched successfully",
            allVideoAdvertisements: allVideoAdvertisements
        });
    } catch (error) {
        console.log("Error Fetching All Video Advertisements:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// update video ad status controller
const updateVideoAdStatus = async(req, res)=>{
    try {
        const {adId, status} = req.body;
        const ad = await VideoAd.findById(adId);
        if(!ad){
            return res.status(404).json({ error: "Advertisement not found" });
        }
        ad.status = status;
        await ad.save();
        res.status(200).json({
            message: "Advertisement status updated successfully",
            status: ad.status
        });
    } catch (error) {
        console.log("Error Updating Video Ad Status:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

//delete video advertisement controller
const deleteVideoAdvertisement = async(req, res)=>{
    try {
        const {id} = req.params;
        const ad = await VideoAd.findById(id);
        if(!ad){
            return res.status(404).json({ error: "Advertisement not found" });
        }
        await VideoAd.findByIdAndDelete(id);
        res.status(200).json({
            message: "Advertisement deleted successfully"
        });
    } catch (error) {
        console.log("Error Deleting Video Advertisement:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// handle carousel imageupload controller
const handleCarouselImageUpload = async(req, res)=>{
    try {
        const files = req.files;
        const mobileImage = files['mobileImage'] ? files['mobileImage'][0].filename : null;
        const desktopImage = files['desktopImage'] ? files['desktopImage'][0].filename : null;
        const carousel = new ImageCarousel({
            mobileImage: mobileImage ? `/carouselImages/${mobileImage}`:null,
            desktopImage: desktopImage ? `/carouselImages/${desktopImage}`:null,
            title: req.body.title,
            description: req.body.description,
            url: req.body.url,
            cast:req.body.cast,
            rating : req.body.rating,
        });
        await carousel.save();
        res.status(200).json({
            message: "Carousel Image Uploaded successfully",
        });
    } catch (error) {
        console.log("Error Uploading Carousel Image:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

// fetch all carousel images controller
const fetchAllCarouselImages = async(req, res)=>{
    try {
        const carousels = await ImageCarousel.find().sort({_id: -1});
        res.status(200).json({
            message: "All Carousel Images fetched successfully",
            carousels: carousels
        });
    } catch (error) {
        console.log("Error Fetching All Carousel Images:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

//delete carousel image controller
const deleteImageCarousel = async(req, res)=>{
    try {
        const {id} = req.params;
        const carousel = await ImageCarousel.findById(id);
        if(!carousel){
            return res.status(404).json({ error: "Carousel Image not found" });
        }
        await ImageCarousel.findByIdAndDelete(id);
        res.status(200).json({
            message: "Carousel Image deleted successfully"
        });
    } catch (error) {
        console.log("Error Deleting Carousel Image:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports = {
    adminLogin,
    addCarousels,
    fetchAllMovies,
    deleteCarousel,
    createList,
    getIndividualMovieDelete,
    getIndividualMovieById,
    AddVideos,


    addItems,
    removeItems,    
    fetchMovieDetailsByRecommendationName,


    deleteList,
    videoStreams,
    movieDetails,
    getIndividualMovieDetails,
    getLastThreeMovies,
    getHowerMovieList,


    sendPlanUpdateMail, //Send Mail Function Update


    // Admin User Management Routes is Been Send From Here
    searchUserByMail,
    updateUserPlan,
    searchUserByPhoneNo,


    //Admin Movie Management Routes is Been Send From Here
    getAllMovies,
    addToRecomendationList,
    viewTopFiveMovies,
    removeFromTopFive,
    viewTopTrendingMovies,
    removeFromTrending,


    viewTrendingMoviewList,
    viewTopFiveMoviesList,


    returnHover,

    // Advertisement Controllers from here
    addAdvertisement,
    fetchAdvertisementForCarousels,
    handleAdClick,
    fetchAdvertisements,
    changeAdvertisementStatus,
    addAdvertisementVideo,
    fetchRandomFullVideoAdvertisements,
    fetchRandomTrailerAdvertisements,
    getAllVideoAdvertisements,
    updateVideoAdStatus,
    deleteVideoAdvertisement,

    // Image carousel Controllers from here
    handleCarouselImageUpload,
    fetchAllCarouselImages,
    deleteImageCarousel,
};