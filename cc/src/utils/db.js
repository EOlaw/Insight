const mongoose = require('mongoose');
// Load environment variables
const dotenv = require('dotenv');
dotenv.config();

const dbUrl = process.env.DB_URL_INSIGHTSERENITY || 'mongodb+srv://EOlaw146:Olawalee_.146@cluster0.4wv68hn.mongodb.net/InsightSerenity?retryWrites=true&w=majority';


const connectDB = async () => {
    try {
        await mongoose.connect(dbUrl);
        const db = mongoose.connection;
        db.once("open", () => {
            console.log("Database connected")
        })
    } catch (error) {
        db.on("error", console.error.bind(console, "connection error:"))
        process.exit(1); // Exit the process with failure
    }
};

module.exports = connectDB;
