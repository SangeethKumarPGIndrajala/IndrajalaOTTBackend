const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const adminAuth = require('../middleware/adminAuth');
const multer = require("multer");

// Set multer limits to accept larger files
const uploadLimits = {
    fileSize: 1024 * 1024 * 1024 * 1200 // Set limit to 1200 GB (adjust as needed)
};

// Image storage configurations
const imagestorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./public/movieImage");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const imageUpload = multer({ storage: imagestorage, limits: uploadLimits });

// Video storage configurations
const videostorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "./public/movieVideos");
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
});

const videoUpload = multer({ storage: videostorage, limits: uploadLimits });

// Configure multer to handle multiple file uploads for movie details
const cpUpload = imageUpload.fields([
    { name: 'movieFullImage', maxCount: 1 },
    { name: 'movieLogoImage', maxCount: 1 },
    { name: 'movieMobileImage', maxCount: 1 },
    { name: 'smallMovieImage', maxCount: 1 },
    { name: 'trailerVideo', maxCount: 1 },
    { name: 'movieVideo', maxCount: 1 }
]);

// Multer configuration for advertisement image upload
const adImageUploadLimits = {
    fileSize: 1024 * 1024 * 1024 * 10 // Set limit to 10 GB (adjust as needed)
}

// Advertisement image storage configurations
const adImageStorage = multer.diskStorage({
    destination: (req, file, cb)=>{
        cb(null, "./public/adImages")
    },
    filename: (req,file, cb)=>{
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}-${file.originalname}`)
    }
});

const adImageUpload = multer({storage:adImageStorage, limits:adImageUploadLimits});

// handling mobile and desktop advertisement image upload
const adImageUploadFields = adImageUpload.fields([
    {name: "mobileImage", maxCount: 1},
    {name: "desktopImage", maxCount: 1}
]);


router.post('/login', adminController.adminLogin);

// Advertisement Routes
router.post('/add-advertisement', adminAuth, adImageUploadFields, adminController.addAdvertisement);
router.get('/get-advertisements-for-carousel',  adminController.fetchAdvertisementForCarousels);
router.get('/get-advertisement-url-on-click/:id', adminAuth, adminController.handleAdClick);
router.get('/get-all-advertisements', adminAuth, adminController.fetchAdvertisements);
router.post('/update-ad-status', adminAuth, adminController.changeAdvertisementStatus);
router.post('/ad-click', adminController.handleAdClick);

//Add Movie Post
router.post('/add-videos', adminAuth, cpUpload, adminController.AddVideos);
router.get('/videos/:id', adminController.videoStreams)


// Route to Fetch the Individual Details of the Movie where the URL of Movie is passed
router.get('/Individual-MovieDetails/:url', adminController.getIndividualMovieDetails);

//---------- Movie Fetch Start Here --------------------//

//Latest Movies Fetching
router.get('/Corrosil-Desktop', adminController.returnHover);


//Trending Movies Fetching
router.get('/toptrending', adminController.viewTrendingMoviewList);


//Top 5 Movies Fetching
router.get('/topfive', adminController.viewTopFiveMoviesList);



//Latest Movies Fetching
router.get('/mostviewed', adminController.getLastThreeMovies);

//Latest Movies Fetching
router.get('/upcomming', adminController.getLastThreeMovies);


//  -------------------Movie Fetch End Here ---------------------------------//


// Movies Fetching Reverse Order
router.get('/CorrosilListMovies', adminController.getLastThreeMovies);


// GET route to list Latest 3 Movies
router.get('/movies', adminAuth, adminController.getHowerMovieList); 


// Route to fetch individual movie by ID
router.get('/movies/:id', adminAuth, adminController.getIndividualMovieById);

// Route to Delete individual movie by ID
router.delete('/movies/:id', adminAuth, adminController.getIndividualMovieDelete);

// POST route to create a new list in Recommendations
router.post('/Create-list', adminAuth, adminController.createList);

// POST route to Delete a  list in Recommendations
router.delete('/list', adminAuth, adminController.deleteList);

// POST route to Add a Items to a list in Recommendations
router.post('/listAddItems', adminAuth, adminController.addItems);

// POST route to Remove Items from a list in Recommendations
router.post('/listRemoveItems', adminAuth, adminController.removeItems);

// POST route to list Movies in a List in Recommendations
router.post('/fetch-movie-detailss', adminAuth, adminController.fetchMovieDetailsByRecommendationName);






// Routes Related to User Management  - SL0 B3 AN90 -  IV Done by SREEJESH 
router.post('/searchUser', adminAuth, adminController.searchUserByMail);
router.post('/upDateUser', adminAuth, adminController.updateUserPlan);
router.post('/searchUserByPhone', adminAuth, adminController.searchUserByPhoneNo);


//Routes Related to Movie Management  - IV Done by SREEJESH
router.get('/showallmovies', adminAuth, adminController.getAllMovies);          //Get all the Movies and show it here
router.post('/AddtoList', adminAuth, adminController.addToRecomendationList);   //Add Movies to Recomendation List
router.get('/ViewTop5Movies',adminController.viewTopFiveMovies);                // GET API For 5 Movies Category
router.get('/viewTopTrending',adminController.viewTopTrendingMovies);           //GET API For Trending Category
router.post('/RemoveFromTopFive', adminAuth, adminController.removeFromTopFive);   // API For Remove Movie from Top Five
router.post('/RemoveFromTrending', adminAuth, adminController.removeFromTrending);   // API For Remove Movie from Top Five
  


module.exports = router;
