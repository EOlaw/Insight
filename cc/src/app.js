// Initialize environment variables
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const app = express();
const path = require('path');
const mongoose = require('mongoose');
const ejsMate = require('ejs-mate');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const passport = require('passport');
const LocalStrategy = require('passport-local');

const User = require('./auth/models/userModel');
const Service = require('./consult/models/serviceModel');

const homeRoutes = require('./routes/homeRoute');
const userRoutes = require('./routes/userRoutes');
const clientRoutes = require('./routes/clientRoutes');
const consultantRoutes = require('./routes/consultantRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const commitRoutes = require('./routes/commitRoutes')
const repositoryRoutes = require('./routes/repositoryRoutes');
// const issueRoutes = require('./routes/issueRoutes');
// const pullRequestRoutes = require('./routes/pullRequestRoutes');

const secret = process.env.SECRET || 'p2xv8BGCmMmIYN1UkFVfrVRZBxeYKr11vLZTfqEMwaE=';

// Set up the view engine
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
// Clear EJS cache
app.set('view cache', false);
app.set('views', path.join(__dirname, 'views'));

// Set up middleware for parsing JSON and handling URL-encoded data
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // This is for JSON data
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
// app.use(morgan('dev'));
// app.use(cors());

// Set up session handling middleware
const sessionConfig = {
    name: 'session',
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        // secure: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
};

app.use(session(sessionConfig));
app.use(flash());

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use(async (req, res, next) => {
    const services = await Service.find().limit(6);
    res.locals.services = services;
    res.locals.currentUser = req.user;
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
});


// Insightserenity Routes
app.use('/', homeRoutes);
app.use('/user', userRoutes);
app.use('/client', clientRoutes);
app.use('/consultant', consultantRoutes);
app.use('/service', serviceRoutes);
app.use('/consultation', consultationRoutes);
// Insightserenity GitHub
app.use('/commit', commitRoutes);
app.use('/repositories', repositoryRoutes);
// app.use('/api/issues', issueRoutes);
// app.use('/api/pull-requests', pullRequestRoutes);

// Handle Error Page
app.all('*', (req, res, next) => {
    next(new ExpressError("Page Not Found", 404 ))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('error', { err })
})

module.exports = app;
