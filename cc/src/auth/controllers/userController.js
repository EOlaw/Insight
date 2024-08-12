const User = require('../models/userModel');
const Consultant = require('../../consult/models/consultantModel');
const Client = require('../../consult/models/clientModel');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userController = {
    // Register Page
    renderRegister: (req, res) => {
        try {
            const user = req.user;
            if (user) return res.redirect('/dashboard');
            return res.status(200).render('users/register');
        } catch (err) {
            res.status(500).json({ message: 'Internal server error', error: err.message });
        }
    },

    // Register User
    registerUser: async (req, res) => {
        try {
            const { username, email, password, role } = req.body;
            const existingUser = await User.findOne({ $or: [{ username }, { email }] });
            
            if (existingUser) {
                return res.status(400).json({ message: 'Username or email already exists' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = new User({ username, email, password: hashedPassword, role });
            await newUser.save();

            if (role === 'consultant') {
                const consultant = new Consultant({ user: newUser._id });
                await consultant.save();
            } else if (role === 'client') {
                const client = new Client({ user: newUser._id });
                await client.save();
            }

            res.status(201).json({ message: 'User registered successfully' });
        } catch (err) {
            res.status(500).json({ message: 'Error registering user', error: err.message });
        }
    },

    // Login Page
    renderLogin: (req, res) => {
        try {
            const user = req.user;
            if (user) return res.redirect('/dashboard');
            return res.status(200).render('users/login');
        } catch (err) {
            res.status(500).json({ message: 'Internal server error', error: err.message });
        }
    },

    // Login User
    loginUser: async (req, res) => {
        try {
            const { username, password } = req.body;
            const user = await User.findOne({ username });

            if (!user) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Invalid credentials' });
            }

            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });
            res.cookie('token', token, { httpOnly: true, maxAge: 24 * 60 * 60 * 1000 });

            res.status(200).json({ message: 'Login successful', user: { id: user._id, username: user.username, role: user.role } });
        } catch (err) {
            res.status(500).json({ message: 'Error logging in', error: err.message });
        }
    },

    // Logout User
    logoutUser: (req, res) => {
        res.clearCookie('token');
        res.status(200).json({ message: 'Logged out successfully' });
    },

    // Get User Profile
    getUserProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user.id).select('-password');
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
                req.user.id,
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