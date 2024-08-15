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
            const user = await Client.findOne({ user: req.user._id }).populate('user', '-password');
            if (!user) return res.status(404).json({ message: 'Client profile not found' });
            const consultations = await Consultation.find({ clientId: user._id }).populate('serviceId')
            res.status(200).render('clients/profile', { user, consultations })
            // res.status(200).json(client);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching client profile', error: err.message });
        }
    },
    renderEditProfile: async (req, res) => {
        try {
            const user = await Client.findOne({ user: req.user._id }).populate('user')
            if (!user) return res.status(404).json({ error: 'Client profile not found' });
            res.status(200).render('clients/edit', { user })
        } catch {
            res.status(500).json({ error: err.message })
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
                return res.status(400).json({ message: 'Billing address must be a string' });
            }
            if (preferredServices && (!Array.isArray(preferredServices) || preferredServices.length === 0)) {
                return res.status(400).json({ message: 'Preferred services must be a non-empty array' });
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
                return res.status(404).json({ message: 'User not found' });
            }

            // Update Client model
            const updatedClient = await Client.findOneAndUpdate(
                { user: req.user._id },
                { $set: clientUpdateData },
                { new: true, runValidators: true }
            ).populate('user', '-password');

            if (!updatedClient) {
                return res.status(404).json({ message: 'Client profile not found' });
            }

            res.status(200).redirect('/client/');
        } catch (err) {
            res.status(500).json({ message: 'Error updating client profile', error: err.message });
        }
    }
],


    // Get Client's Consultations
    getClientConsultations: async (req, res) => {
        try {
            const clientId = req.user._id;
            const consultations = await Consultation.find({ client: clientId })
                .populate('consultant', 'username')
                .populate('consultant', 'username')
                .populate('service', 'name')
                .sort({ dateTime: -1 });  // Sort by date, most recent first

            res.status(200).json(consultations);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultations', error: err.message });
        }
    },

    // Book a Consultation
    bookConsultation: async (req, res) => {
        try {
            const { consultantId, serviceId, dateTime, duration } = req.body;
            const clientId = req.user._id;
            
            // Validate input
            if (!consultantId || !serviceId || !dateTime || !duration) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Check if consultant exists and is available
            const consultant = await User.findById(consultantId);
            if (!consultant || consultant.role !== 'consultant') {
                return res.status(404).json({ message: 'Consultant not found' });
            }

            // TODO: Check consultant's availability

            const newConsultation = new Consultation({
                client: clientId,
                consultant: consultantId,
                service: serviceId,
                dateTime: new Date(dateTime),
                duration,
                status: 'scheduled'
            });
            await newConsultation.save();

            res.status(201).json({ message: 'Consultation booked successfully', consultation: newConsultation });
        } catch (err) {
            res.status(500).json({ message: 'Error booking consultation', error: err.message });
        }
    },

    // Cancel a Consultation
    cancelConsultation: async (req, res) => {
        try {
            const { consultationId } = req.params;
            const clientId = req.user._id;
            
            const consultation = await Consultation.findOneAndUpdate(
                { _id: consultationId, client: clientId, status: 'scheduled' },
                { $set: { status: 'cancelled' } },
                { new: true }
            );

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found or cannot be cancelled' });
            }

            res.status(200).json({ message: 'Consultation cancelled successfully', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error cancelling consultation', error: err.message });
        }
    }
};

module.exports = clientController;