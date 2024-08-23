const app = require('./src/app');
const mongoose = require('mongoose');
const https = require('https');
const fs = require('fs');

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

const githubRoutes = require('./github/githubRoutes');
app.use('/github', githubRoutes);

const PORT = process.env.PORT || 4500;

if (process.env.NODE_ENV !== 'production') {
    const httpsOptions = {
        key: fs.readFileSync('localhost-key.pem'),
        cert: fs.readFileSync('localhost.pem')
    };

    https.createServer(httpsOptions, app).listen(PORT, () => {
        console.log(`HTTPS server running on https://localhost:${PORT}`);
    });
} else {
    app.listen(PORT, () => {
        console.log(`HTTP server running on port ${PORT}`);
    });
}