const Consultant = require('../models/consultantModel');

const consultantController = {
    // Create a new consultant
    createConsultant: async (req, res) => {
        try {
            const { name, specialization, bio, profilePicture } = req.body;

            // Validate input
            if (!name || !specialization || !bio) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            const consultant = new Consultant({ name, specialization, bio, profilePicture });
            await consultant.save();

            res.status(201).json({ message: 'Consultant created successfully', consultant });
        } catch (error) {
            res.status(500).json({ message: 'Error creating consultant', error });
        }
    },

    // Get all consultants
    getAllConsultants: async (req, res) => {
        try {
            const consultants = await Consultant.find();
            res.status(200).json(consultants);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching consultants', error });
        }
    },

    // Get a consultant by ID
    getConsultantById: async (req, res) => {
        try {
            const { id } = req.params;

            const consultant = await Consultant.findById(id);
            if (!consultant) {
                return res.status(404).json({ message: 'Consultant not found' });
            }

            res.status(200).json(consultant);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching consultant', error });
        }
    },

    // Update a consultant by ID
    updateConsultant: async (req, res) => {
        try {
            const { id } = req.params;
            const updates = req.body;

            const consultant = await Consultant.findByIdAndUpdate(id, updates, { new: true });
            if (!consultant) {
                return res.status(404).json({ message: 'Consultant not found' });
            }

            res.status(200).json({ message: 'Consultant updated successfully', consultant });
        } catch (error) {
            res.status(500).json({ message: 'Error updating consultant', error });
        }
    },

    // Delete a consultant by ID
    deleteConsultant: async (req, res) => {
        try {
            const { id } = req.params;

            const consultant = await Consultant.findByIdAndDelete(id);
            if (!consultant) {
                return res.status(404).json({ message: 'Consultant not found' });
            }

            res.status(200).json({ message: 'Consultant deleted successfully' });
        } catch (error) {
            res.status(500).json({ message: 'Error deleting consultant', error });
        }
    }
};

module.exports = consultantController;
