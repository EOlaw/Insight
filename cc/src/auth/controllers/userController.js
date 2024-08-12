const User = require('../models/userModel');
const Consultant = require('../../consult/models/consultantModel');
const Client = require('../../consult/models/clientModel');
const passport = require('passport');

const userController = {
    // Register Page
    renderRegister: (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        }
        res.status(200).render('users/register');
    },

    // Register User
    registerUser: async (req, res) => {
        try {
            const { username, email, password, role } = req.body;
            
            // Validate role
            const validRoles = ['consultant', 'client', 'staff'];
            if (!validRoles.includes(role)) {
                return res.status(400).json({ message: 'Invalid role. Must be consultant, client, or staff.' });
            }

            // Check if user already exists
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            if (existingUser) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }

            // Create new user
            const newUser = new User({ username, email, role });
            
            // Register user with passport
            User.register(newUser, password, async (err, user) => {
                if (err) {
                    return res.status(500).json({ message: 'Error registering user', error: err.message });
                }

                // Create associated profile based on role
                try {
                    switch (role) {
                        case 'consultant':
                            await new Consultant({ user: user._id }).save();
                            break;
                        case 'client':
                            await new Client({ user: user._id }).save();
                            break;
                        case 'staff':
                            await new Staff({ user: user._id }).save();
                            break;
                    }
                } catch (err) {
                    // If profile creation fails, delete the user and return an error
                    await User.findByIdAndDelete(user._id);
                    return res.status(500).json({ message: 'Error creating user profile', error: err.message });
                }

                res.status(201).json({ message: 'User registered successfully', role: user.role });
            });
        } catch (err) {
            res.status(500).json({ message: 'Error registering user', error: err.message });
        }
    },

    // Login Page
    renderLogin: (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/dashboard');
        }
        res.status(200).render('users/login');
    },

    // Login User
    loginUser: (req, res, next) => {
        passport.authenticate('local', (err, user, info) => {
            if (err) {
                return res.status(500).json({ message: 'Error during authentication', error: err.message });
            }
            if (!user) {
                return res.status(401).json({ message: info.message || 'Authentication failed' });
            }
            req.logIn(user, (err) => {
                if (err) {
                    return res.status(500).json({ message: 'Error logging in', error: err.message });
                }
                return res.status(200).json({ message: 'Login successful', user: { id: user._id, username: user.username, role: user.role } });
            });
        })(req, res, next);
    },

    // Logout User
    logoutUser: (req, res) => {
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ message: 'Error logging out', error: err.message });
            }
            res.status(200).json({ message: 'Logged out successfully' });
        });
    },

    // Get User Profile
    getUserProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user._id).select('-password');
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            res.status(200).json(user);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching user profile', error: err.message });
        }
    },

    // Update User Profile
    updateUserProfile: async (req, res) => {
        try {
            const { firstName, lastName, phoneNumber } = req.body;
            const updatedUser = await User.findByIdAndUpdate(
                req.user._id,
                { $set: { firstName, lastName, phoneNumber } },
                { new: true, runValidators: true }
            ).select('-password');

            if (!updatedUser) {
                return res.status(404).json({ message: 'User not found' });
            }

            res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
        } catch (err) {
            res.status(500).json({ message: 'Error updating user profile', error: err.message });
        }
    }
};

module.exports = userController;