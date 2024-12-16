const express = require("express");
const router = express.Router();
const userController = require('../controllers/userController');
const {userAuth}=require('../middleware/userAuth');



// register and login routes

router.post('/register',userController.register);                                 //Tested
router.post('/login',userController.login)                                        //Tested 
router.post('/forgot',userController.forgot)                                      //Tested
router.post('/UpdatePass',userController.resetPassword)

//Fetch Movie Details
router.get('/movie/:url', userController.getIndividualMovieDetails);
router.get('/DeltaFetchMovie/:url', userController.getVideoMovie);
router.get('/PlayTrailer/:url', userController.getIndividualMovieDetailsByID);

router.post('/checkexp',userController.checkexpValid);
router.post('/Profileinfo',userController.profileDataBack);



module.exports = router