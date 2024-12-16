const mongoose = require("mongoose");

const movieSchema = mongoose.Schema({
    movieName: {
        type: String,
    },
    year: {
        type: Number,
    },
    rating: {
        type: String,
        enum: ['U', 'U/A', 'A']
    },
    ageLimit: {
        type: String,
    },
    description: {
        type: String,
    },
    duration: {
        type: String,
    },
    starring: {
        type: [String],
        required: true
    },
    category: {
        type: [String],
    },
    url: {
        type: String,
    },
    movieFullImage: {
        type: String,
    },
    movieLogoImage: {
        type: String,
    },
    movieMobileImage: {
        type: String,
    },
    smallMovieImage: {
        type: String,
    },
    trailerVideo: {
        type: String,
    },
    movieVideo: {
        type: String,
    },
    like: {
        type: Number,
        default: 0
    },
    views: {
        type: Number,
        default: 0
    },
    dislike: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Movies = mongoose.model('Movies', movieSchema);
module.exports = { Movies };
