const User = require('../models/userModel');
const Consultant = require('../../consult/models/consultantModel');
const Client = require('../../consult/models/clientModel');
const passport = require('passport');
const mongoose = require('mongoose');
const multer = require('multer');

// Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const userController = {
    renderRegister: (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/');
        }
        res.status(200).render('users/register');
    },

    registerUser: [
    upload.single('avatar'),
        async (req, res) => {
            try {
                const { username, email, password, role, firstName, lastName, phoneNumber, isAdmin, isDeveloper } = req.body;
                
                // Check if the user is registering as an admin or developer
                if (isAdmin || isDeveloper) {
                    // For admin or developer, role is not required
                    const newUser = new User({ 
                        username, 
                        email, 
                        firstName, 
                        lastName, 
                        phoneNumber,
                        isAdmin: isAdmin ? true : false,
                        isDeveloper: isDeveloper ? true : false,
                        profile: {
                            avatar: req.file ? {
                                data: req.file.buffer.toString('base64'),
                                contentType: req.file.mimetype
                            } : undefined
                        }
                    });

                    User.register(newUser, password, (err, user) => {
                        if (err) {
                            return res.status(500).json({ message: 'Error registering user', error: err.message });
                        }
                        res.status(201).redirect('/');
                    });
                } else {
                    // For non-admin and non-developer users, proceed with role validation
                    const validRoles = ['consultant', 'client', 'staff'];
                    if (!validRoles.includes(role)) return res.status(400).json({ message: 'Invalid role. Must be consultant, client, or staff.' });
            
                    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
                    if (existingUser) return res.status(400).json({ message: 'Username or email already exists' });
            
                    const newUser = new User({ 
                        username, 
                        email, 
                        role, 
                        firstName, 
                        lastName, 
                        phoneNumber,
                        profile: {
                            avatar: req.file ? {
                                data: req.file.buffer.toString('base64'),
                                contentType: req.file.mimetype
                            } : undefined
                        }
                    });
                    
                    User.register(newUser, password, async (err, user) => {
                        if (err) return res.status(500).json({ message: 'Error registering user', error: err.message });
            
                        try {
                            switch (role) {
                                case 'consultant':
                                    await new Consultant({ user: user._id }).save();
                                    break;
                                case 'client':
                                    await new Client({ user: user._id }).save();
                                    break;
                            }
                        } catch (profileErr) {
                            await User.findByIdAndDelete(user._id);
                            return res.status(500).json({ message: 'Error creating user profile', error: profileErr.message });
                        }
            
                        res.status(201).redirect('/');
                    });
                }
            } catch (err) {
                res.status(500).json({ message: 'Error registering user', error: err.message });
            }
        }
    ],

    renderLogin: (req, res) => {
        if (req.isAuthenticated()) {
            return res.redirect('/');
        }
        res.status(200).render('users/login');
    },

    loginUser: async (req, res, next) => {
        
        const user = req.user
        try {
            if (user.role === 'consultant') {
                const consultant = await Consultant.findOne({ user: user._id });
                if (consultant) {
                    return res.redirect('/consultant/');
                }
            } else if (user.role === 'client') {
                const client = await Client.findOne({ user: user._id });
                if (client) {
                    return res.redirect('/client/');
                }
            }
            // If no specific role or profile found, redirect to a default page
            return res.status(200).redirect('/');
            // return res.status(200).json({ message: 'Login successful', user: user });
        } catch (err) {
            console.error('Error during role-based redirection:', err);
            return res.status(500).json({ message: 'Error during redirection', error: err.message });
        }
    },

    logoutUser: (req, res) => {
        req.logout((err) => {
            if (err) {
                return res.status(500).json({ message: 'Error logging out', error: err.message });
            }
            res.status(200).redirect('/')
        });
    },

    getUserProfile: async (req, res) => {
        try {
            const user = await User.findById(req.user._id);
            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }
            const userResponse = {
                id: user._id,
                username: user.username,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                phoneNumber: user.phoneNumber,
                role: user.role,
                isAdmin: user.isAdmin,
                isDeveloper: user.isDeveloper,
                isVerified: user.isVerified
            };
            res.status(200).json(userResponse);
        } catch (err) {
            console.error('Error in getUserProfile:', err);
            res.status(500).json({ message: 'Error fetching user profile', error: err.message });
        }
    },

    updateUserAccount: async (req, res) => {
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
    },

    deleteUserAccount: async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();
    
        try {
            const userId = req.user._id;
    
            // Find and delete the user
            const deletedUser = await User.findByIdAndDelete(userId).session(session);
            if (!deletedUser) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'User not found' });
            }
    
            // Delete associated profile based on user role
            if (deletedUser.role === 'client') {
                await Client.findOneAndDelete({ user: userId }).session(session);
            } else if (deletedUser.role === 'consultant') {
                await Consultant.findOneAndDelete({ user: userId }).session(session);
            }
    
            // Delete associated data (e.g., consultations, reviews, etc.)
            // Add more deletions here as needed for your application
            // For example:
            // await Consultation.deleteMany({ client: userId }).session(session);
            // await Review.deleteMany({ user: userId }).session(session);
    
            await session.commitTransaction();
            req.logout((err) => {
                if (err) {
                    console.error('Error logging out after account deletion:', err);
                }
                res.status(200).redirect('/')
            });
        } catch (err) {
            await session.abortTransaction();
            console.error('Error in deleteUserAccount:', err);
            res.status(500).json({ message: 'Error deleting user account', error: err.message });
        } finally {
            session.endSession();
        }
    },
};

module.exports = userController;