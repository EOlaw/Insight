const Consultant = require('../../consult/models/consultantModel');
const Consultation = require('../../consult/models/consultationModel');

const consultantController = {
    // Get Consultant Profile
    getConsultantProfile: async (req, res) => {
        try {
            const consultant = await Consultant.findOne({ user: req.user.id }).populate('user', '-password');
            if (!consultant) {
                return res.status(404).json({ message: 'Consultant profile not found' });
            }
            res.status(200).json(consultant);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultant profile', error: err.message });
        }
    },

    // Update Consultant Profile
    updateConsultantProfile: async (req, res) => {
        try {
            const { specializations, yearsOfExperience, availabilitySchedule, certifications } = req.body;
            const updatedConsultant = await Consultant.findOneAndUpdate(
                { user: req.user.id },
                { $set: { specializations, yearsOfExperience, availabilitySchedule, certifications } },
                { new: true, runValidators: true }
            ).populate('user', '-password');

            if (!updatedConsultant) {
                return res.status(404).json({ message: 'Consultant profile not found' });
            }

            res.status(200).json({ message: 'Consultant profile updated successfully', consultant: updatedConsultant });
        } catch (err) {
            res.status(500).json({ message: 'Error updating consultant profile', error: err.message });
        }
    },

    // Get Consultant's Consultations
    getConsultantConsultations: async (req, res) => {
        try {
            const consultations = await Consultation.find({ consultant: req.user.id })
                .populate('client', 'username')
                .populate('service', 'name');
            res.status(200).json(consultations);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultations', error: err.message });
        }
    },

    // Get Consultant's Availability
    getConsultantAvailability: async (req, res) => {
        try {
            const consultant = await Consultant.findOne({ user: req.user.id });
            if (!consultant) {
                return res.status(404).json({ message: 'Consultant not found' });
            }
            res.status(200).json({ availability: consultant.availabilitySchedule });
        } catch (err) {
            res.status(500).json({ message: 'Error fetching availability', error: err.message });
        }
    },

    // Update Consultant's Availability
    updateConsultantAvailability: async (req, res) => {
        try {
            const { availabilitySchedule } = req.body;
            const updatedConsultant = await Consultant.findOneAndUpdate(
                { user: req.user.id },
                { $set: { availabilitySchedule } },
                { new: true, runValidators: true }
            );

            if (!updatedConsultant) {
                return res.status(404).json({ message: 'Consultant not found' });
            }

            res.status(200).json({ message: 'Availability updated successfully', availability: updatedConsultant.availabilitySchedule });
        } catch (err) {
            res.status(500).json({ message: 'Error updating availability', error: err.message });
        }
    }
};

module.exports = consultantController;