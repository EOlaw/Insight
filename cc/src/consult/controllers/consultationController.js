const Consultation = require('../../consult/models/consultationModel');
// const Feedback = require('../../consult/models/feedbackModel');

const consultationController = {
    // Get Consultation Details
    getConsultationDetails: async (req, res) => {
        try {
            const { consultationId } = req.params;
            const consultation = await Consultation.findById(consultationId)
                .populate('client', 'username')
                .populate('consultant', 'username')
                .populate('service', 'name');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            // Check if the requesting user is either the client or the consultant
            if (consultation.client._id.toString() !== req.user._id.toString() && 
                consultation.consultant._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to view this consultation' });
            }

            res.status(200).json(consultation);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultation details', error: err.message });
        }
    },

    // Update Consultation Notes
    updateConsultationNotes: async (req, res) => {
        try {
            const { consultationId } = req.params;
            const { notes } = req.body;
            const updatedConsultation = await Consultation.findByIdAndUpdate(
                { _id: consultationId, consultant: req.user._id },
                { $set: { notes } },
                { new: true, runValidators: true }
            );

            if (!updatedConsultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            res.status(200).json({ message: 'Consultation notes updated successfully', consultation: updatedConsultation });
        } catch (err) {
            res.status(500).json({ message: 'Error updating consultation notes', error: err.message });
        }
    },

    // Complete Consultation
    completeConsultation: async (req, res) => {
        try {
            const { consultationId } = req.params;
            const updatedConsultation = await Consultation.findByIdAndUpdate(
                { _id: consultationId, consultant: req.user._id, status: 'scheduled' },
                { $set: { status: 'completed' } },
                { new: true, runValidators: true }
            );

            if (!updatedConsultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            res.status(200).json({ message: 'Consultation marked as completed', consultation: updatedConsultation });
        } catch (err) {
            res.status(500).json({ message: 'Error completing consultation', error: err.message });
        }
    },

    /*

    // Provide Feedback
    provideFeedback: async (req, res) => {
        try {
            const { consultationId } = req.params;
            const { rating, comment } = req.body;
            
            const consultation = await Consultation.findById(consultationId);
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            const feedback = new Feedback({
                consultation: consultationId,
                client: consultation.client,
                consultant: consultation.consultant,
                rating,
                comment
            });
            await feedback.save();

            await Consultation.findByIdAndUpdate(consultationId, { $push: { feedback: feedback._id } });

            res.status(201).json({ message: 'Feedback provided successfully', feedback });
        } catch (err) {
            res.status(500).json({ message: 'Error providing feedback', error: err.message });
        }
    }

    */
};

module.exports = consultationController;