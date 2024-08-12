// Import the necessary modules.
const User = require('../models/userModel');
const Consultant = require('../../consult/models/consultantModel');
const Client = require('../../consult/models/clientModel');
const passport = require('passport');

// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    req.session.returnTo = req.originalUrl;
    return res.status(401).json({ message: 'Authentication required' });
}

// Middleware to check if user is admin
function authorizeAdmin(req, res, next) {
    if (req.isAuthenticated()) {
        User.findById(req.user._id)
            .then((user) => {
                if (user && user.isAdmin) {
                    next();
                } else {
                    console.log('User is not admin. Access denied.');
                    return res.status(403).json({ message: 'Access denied. You are not allowed to access.' });
                }
            })
            .catch((err) => {
                console.error('Error while checking admin status:', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            });
    } else {
        console.log('User is not authenticated. Authentication required.');
        return res.status(401).json({ message: 'Authentication required' });
    }
}

// Middleware to check if user is authorized as consultant
function authorizeConsultant(req, res, next) {
    if (req.isAuthenticated()) {
        User.findById(req.user._id)
            .then((user) => {
                if (user && user.role === 'consultant') {
                    next();
                } else {
                    console.log('User is not authorized as consultant. Access denied.');
                    return res.status(403).json({ message: 'Access denied. You are not allowed to access.' });
                }
            })
            .catch((err) => {
                console.error('Error while checking authorization as consultant:', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            });
    } else {
        console.log('User is not authenticated. Authentication required.');
        return res.status(401).json({ message: 'Authentication required' });
    }
}

// Middleware to check if user is authorized as client
function authorizeClient(req, res, next) {
    if (req.isAuthenticated()) {
        User.findById(req.user._id)
            .then((user) => {
                if (user && user.role === 'client') {
                    next();
                } else {
                    return res.status(403).json({ message: 'Access denied. You are not allowed to access.' });
                }
            })
            .catch((err) => {
                console.error('Error while checking authorization as client:', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            });
    } else {
        console.log('User is not authenticated. Authentication required.');
        return res.status(401).json({ message: 'Authentication required' });
    }
}

// Middleware to check if user is authorized as developer
function authorizeDeveloper(req, res, next) {
    if (req.isAuthenticated()) {
        User.findById(req.user._id)
            .then((user) => {
                if (user && user.isDeveloper) {
                    next();
                } else {
                    return res.status(403).json({ message: 'Access denied. You are not allowed to access.' });
                }
            })
            .catch((err) => {
                console.error('Error while checking authorization as developer:', err);
                return res.status(500).json({ message: 'Internal Server Error' });
            });
    } else {
        console.log('User is not authenticated. Authentication required.');
        return res.status(401).json({ message: 'Authentication required' });
    }
}

module.exports = { 
    isAuthenticated, 
    authorizeAdmin, 
    authorizeConsultant, 
    authorizeClient, 
    authorizeDeveloper 
};