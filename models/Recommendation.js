const mongoose = require("mongoose");

const recommendationSchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true,
    },
    movies: [
        {
            movieName: String,
            year: Number,
            rating: {
                type: String,
                enum: ['U', 'U/A', 'A'],
            },
            ageLimit: String,
            description: String,
            duration: String,
            starring: [String],
            category: [String],
            url: {
                type: String, 
                required: true,
            },
            movieMobileImage: String
        }
    ]
});

const Recommendation = mongoose.model('Recommendation', recommendationSchema);

module.exports = Recommendation;
