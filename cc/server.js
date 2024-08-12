const app = require('./src/app');
const mongoose = require('mongoose');

// Initialize environment variables
const dotenv = require('dotenv');
dotenv.config();

const dbUrl = process.env.DB_URL_INSIGHTSERENITY || 'mongodb+srv://EOlaw146:Olawalee_.146@cluster0.4wv68hn.mongodb.net/InsightSerenity?retryWrites=true&w=majority';

// Set up the database connection
mongoose.connect(dbUrl);
const db = mongoose.connection;
// Check for database connection errors
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

const PORT = process.env.PORT || 4500;
app.listen(PORT, () => {
    console.log(`Serving on port ${PORT}`);
});


