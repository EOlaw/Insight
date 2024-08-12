const Client = require('../../consult/models/clientModel');
const Consultation = require('../../consult/models/consultationModel');
const User = require('../../auth/models/userModel');

const clientController = {
    // Get Client Profile
    getClientProfile: async (req, res) => {
        try {
            const client = await Client.findOne({ user: req.user._id }).populate('user', '-password');
            if (!client) {
                return res.status(404).json({ message: 'Client profile not found' });
            }
            res.status(200).json(client);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching client profile', error: err.message });
        }
    },

    // Update Client Profile
    updateClientProfile: async (req, res) => {
        try {
            const { company, industry, billingAddress, preferredServices } = req.body;
            
            // Validate input
            if (billingAddress && typeof billingAddress !== 'string') {
                return res.status(400).json({ message: 'Billing address must be a string' });
            }
            if (preferredServices && (!Array.isArray(preferredServices) || preferredServices.length === 0)) {
                return res.status(400).json({ message: 'Preferred services must be a non-empty array' });
            }

            const updatedClient = await Client.findOneAndUpdate(
                { user: req.user._id },
                { $set: { company, industry, billingAddress, preferredServices } },
                { new: true, runValidators: true }
            ).populate('user', '-password');

            if (!updatedClient) {
                return res.status(404).json({ message: 'Client profile not found' });
            }

            res.status(200).json({ message: 'Client profile updated successfully', client: updatedClient });
        } catch (err) {
            res.status(500).json({ message: 'Error updating client profile', error: err.message });
        }
    },

    // Get Client's Consultations
    getClientConsultations: async (req, res) => {
        try {
            const consultations = await Consultation.find({ client: req.user._id })
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
            
            // Validate input
            if (!consultantId || !serviceId || !dateTime || !duration) {
                return res.status(400).json({ message: 'Missing required fields' });
            }
            if (typeof duration !== 'number' || duration <= 0) {
                return res.status(400).json({ message: 'Duration must be a positive number' });
            }

            // Check if consultant exists and is available
            const consultant = await User.findById(consultantId);
            if (!consultant || consultant.role !== 'consultant') {
                return res.status(404).json({ message: 'Consultant not found' });
            }

            // TODO: Check consultant's availability

            const newConsultation = new Consultation({
                client: req.user._id,
                consultant: consultantId,
                service: serviceId,
                dateTime: new Date(dateTime),
                duration
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
            
            const consultation = await Consultation.findOneAndUpdate(
                { _id: consultationId, client: req.user._id, status: 'scheduled' },
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