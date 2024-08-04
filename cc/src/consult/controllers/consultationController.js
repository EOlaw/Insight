const Consultation = require('../models/consultationModel');
const Consultant = require('../models/consultantModel');
const Service = require('../models/serviceModel');

const consultationController = {
    // Create a new consultation
    createConsultation: async (req, res) => {
        try {
            const { consultantId, serviceId, date, timeSlot, notes } = req.body;
            const clientId = req.user.id; // Assuming the user is authenticated and their ID is in req.user

            // Validate input
            if (!consultantId || !serviceId || !date || !timeSlot) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            // Check if the consultant and service exist
            const consultant = await Consultant.findById(consultantId);
            if (!consultant || !consultant.available) {
                return res.status(404).json({ message: 'Consultant not available' });
            }

            const service = await Service.findById(serviceId);
            if (!service) {
                return res.status(404).json({ message: 'Service not found' });
            }

            const consultation = new Consultation({
                client: clientId,
                consultant: consultantId,
                service: serviceId,
                date,
                timeSlot,
                status: 'Pending',
                notes
            });

            await consultation.save();
            res.status(201).json({ message: 'Consultation created successfully', consultation });
        } catch (error) {
            res.status(500).json({ message: 'Error creating consultation', error });
        }
    },

    // Get all consultations for a client
    getClientConsultations: async (req, res) => {
        try {
            const clientId = req.user.id;

            const consultations = await Consultation.find({ client: clientId })
                .populate('consultant')
                .populate('service');

            res.status(200).json(consultations);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching consultations', error });
        }
    },

    // Get all consultations for a consultant
    getConsultantConsultations: async (req, res) => {
        try {
            const consultantId = req.user.id;

            const consultations = await Consultation.find({ consultant: consultantId })
                .populate('client')
                .populate('service');

            res.status(200).json(consultations);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching consultations', error });
        }
    },

    // Get a consultation by ID
    getConsultationById: async (req, res) => {
        try {
            const { id } = req.params;

            const consultation = await Consultation.findById(id)
                .populate('consultant')
                .populate('service');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            res.status(200).json(consultation);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching consultation', error });
        }
    },

    // Update a consultation by ID (e.g., change status, reschedule)
    updateConsultation: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            const consultation = await Consultation.findByIdAndUpdate(id, updates, { new: true });
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            res.status(200).json({ message: 'Consultation updated successfully', consultation });
        } catch (error) {
            res.status(500).json({ message: 'Error updating consultation', error });
        }
    },

    // Delete a consultation by ID
    deleteConsultation: async (req, res) => {
        try {
            const { id } = req.params;

            const consultation = await Consultation.findByIdAndDelete(id);
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            res.status(200).json({ message: 'Consultation deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting consultation', error });
        }
    }
};

module.exports = consultationController;
