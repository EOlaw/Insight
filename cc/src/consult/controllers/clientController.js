const Client = require('../../consult/models/clientModel');
const Consultation = require('../../consult/models/consultationModel');
const User = require('../../auth/models/userModel');
const mongoose = require('mongoose');
const multer = require('multer');

// Multer setup for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const clientController = {
    // Get Client Profile
    getClientProfile: async (req, res) => {
        try {
            const client = await Client.findOne({ user: req.user._id }).populate('user', '-password');
            if (!client) return res.status(404).render('error', { statusCode: 404, message: 'Client profile not found' });
            
            console.log('Client ID:', client._id);
            
            const consultations = await Consultation.find({ client: client._id })
                .populate('service', 'name basePrice currency')
                .populate({
                    path: 'consultant',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName'
                    }
                })
                .sort({ dateTime: -1 });
            
            console.log('Consultations:', JSON.stringify(consultations, null, 2));
            
            const clientObject = client.toObject();
            clientObject.consultations = consultations.map(consultation => {
                const consultationObject = consultation.toObject();
                if (consultation.consultant && consultation.consultant.user) {
                    consultationObject.consultant = {
                        firstName: consultation.consultant.user.firstName,
                        lastName: consultation.consultant.user.lastName
                    };
                }
                if (consultation.service) {
                    consultationObject.service = {
                        name: consultation.service.name || 'Unknown Service',
                        formattedPrice: consultation.service.formattedPrice || 'Price not available'
                    };
                } else {
                    consultationObject.service = {
                        name: 'Unknown Service',
                        formattedPrice: 'Price not available'
                    };
                }
                return consultationObject;
            });

            res.status(200).render('clients/profile', { 
                user: clientObject,
                currentUser: req.user
            });
        } catch (err) {
            console.error('Error in getClientProfile:', err);
            res.status(500).render('error', { statusCode: 500, message: 'Error fetching client profile' });
        }
    },

    renderEditProfile: async (req, res) => {
        try {
            const user = await Client.findOne({ user: req.user._id }).populate('user')
            if (!user) return res.status(404).render('error', { statusCode: 404, message: 'Client profile not found' });
            res.status(200).render('clients/edit', { user })
        } catch (err) {
            res.status(500).render('error', { statusCode: 500, message: 'Error loading edit profile page' });
        }
    },

    // Update Client Profile
    updateClientProfile: [
        upload.single('avatar'),
        async (req, res) => {
            try {
                const { company, industry, billingAddress, preferredServices, firstName, lastName, email, phoneNumber } = req.body;
                
                // Validate input
                if (billingAddress && typeof billingAddress !== 'string') {
                    return res.status(400).render('error', { statusCode: 400, message: 'Billing address must be a string' });
                }
                if (preferredServices && (!Array.isArray(preferredServices) || preferredServices.length === 0)) {
                    return res.status(400).render('error', { statusCode: 400, message: 'Preferred services must be a non-empty array' });
                }

                let clientUpdateData = { company, industry, billingAddress, preferredServices };
                let userUpdateData = { firstName, lastName, email, phoneNumber };

                // Handle file upload
                if (req.file) {
                    userUpdateData['profile.avatar'] = {
                        data: req.file.buffer.toString('base64'),
                        contentType: req.file.mimetype
                    };
                }

                // Update User model
                const updatedUser = await User.findByIdAndUpdate(
                    req.user._id,
                    { $set: userUpdateData },
                    { new: true, runValidators: true }
                );

                if (!updatedUser) {
                    return res.status(404).render('error', { statusCode: 404, message: 'User not found' });
                }

                // Update Client model
                const updatedClient = await Client.findOneAndUpdate(
                    { user: req.user._id },
                    { $set: clientUpdateData },
                    { new: true, runValidators: true }
                ).populate('user', '-password');

                if (!updatedClient) {
                    return res.status(404).render('error', { statusCode: 404, message: 'Client profile not found' });
                }

                res.status(200).redirect('/client/');
            } catch (err) {
                res.status(500).render('error', { statusCode: 500, message: 'Error updating client profile', error: err.message });
            }
        }
    ],

    // Get Client's Consultations
    getClientConsultations: async (req, res) => {
        try {
            const client = await Client.findOne({ user: req.user._id });
            if (!client) {
                return res.status(404).render('error', { statusCode: 404, message: 'Client not found' });
            }
            
            const consultations = await Consultation.find({ client: client._id })
                .populate('consultant', 'user')
                .populate({
                    path: 'consultant',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName'
                    }
                })
                .populate('service', 'name')
                .sort({ dateTime: -1 });

            res.status(200).json(consultations);
        } catch (err) {
            res.status(500).render('error', { statusCode: 500, message: 'Error fetching consultations', error: err.message });
        }
    },

    // Cancel a Consultation
    cancelConsultation: async (req, res) => {
        try {
            const { consultationId } = req.params;
            const client = await Client.findOne({ user: req.user._id });
            
            if (!client) {
                return res.status(404).render('error', { statusCode: 404, message: 'Client not found' });
            }
            
            const consultation = await Consultation.findOneAndUpdate(
                { _id: consultationId, client: client._id, status: 'scheduled' },
                { $set: { status: 'cancelled' } },
                { new: true }
            );

            if (!consultation) {
                return res.status(404).render('error', { statusCode: 404, message: 'Consultation not found or cannot be cancelled' });
            }

            res.status(200).json({ message: 'Consultation cancelled successfully', consultation });
        } catch (err) {
            res.status(500).render('error', { statusCode: 500, message: 'Error cancelling consultation', error: err.message });
        }
    }
};

module.exports = clientController;