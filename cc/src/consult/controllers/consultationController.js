const Consultation = require('../models/consultationModel');
const Client = require('../models/clientModel');
const Consultant = require('../models/consultantModel');
const Service = require('../models/serviceModel');
const User = require('../../auth/models/userModel');
const mongoose = require('mongoose');
const emailService = require('../../utils/emailService'); // Assuming you have an email service

const consultationController = {
    // Create a new consultation
    createConsultation: async (req, res) => {
        try {
            const { consultantId, serviceId, dateTime, duration } = req.body;
            const clientId = req.user._id;

            const [consultant, service, client] = await Promise.all([
                Consultant.findById(consultantId).populate('user', 'email'),
                Service.findById(serviceId),
                Client.findOne({ user: clientId }).populate('user', 'email')
            ]);

            if (!consultant || !service || !client) {
                return res.status(404).json({ message: 'Consultant, service, or client not found' });
            }

            const price = service.basePrice * (duration / 60); // Assuming basePrice is per hour

            const newConsultation = new Consultation({
                client: clientId,
                consultant: consultantId,
                service: serviceId,
                dateTime,
                duration,
                price,
                statusHistory: [{ status: 'scheduled', changedAt: new Date(), changedBy: clientId }]
            });

            await newConsultation.save();

            console.log("Client email:", client.user.email); // Debug log

            // Send confirmation emails
            try {
                await emailService.sendConsultationConfirmation(client.user, newConsultation);
            } catch (emailError) {
                console.error('Error sending client email:', emailError);
            }
            try {
                await emailService.sendEmail(
                    consultant.email,
                    'New Consultation Scheduled',
                    'newConsultationNotification',
                    { consultationDetails: newConsultation }
                );
            } catch (emailError) {
                console.error('Error sending consultant email:', emailError);
            }

            res.status(201).json({ message: 'Consultation created successfully', consultation: newConsultation });
        } catch (err) {
            res.status(500).json({ message: 'Error creating consultation', error: err.message });
        }
    },

    // Get all consultations (Admin only)
    getAllConsultations: async (req, res) => {
        try {
            const { page = 1, limit = 10, status, startDate, endDate } = req.query;
            const query = {};

            if (status) query.status = status;
            if (startDate && endDate) {
                query.dateTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
            }

            const consultations = await Consultation.find(query)
                .populate('client', 'firstName lastName email')
                .populate('consultant', 'firstName lastName email')
                .populate('service', 'name')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ dateTime: -1 });

            const count = await Consultation.countDocuments(query);

            res.status(200).json({
                consultations,
                totalPages: Math.ceil(count / limit),
                currentPage: Number(page)
            });
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultations', error: err.message });
        }
    },

    // Get consultations for a specific client
    getClientConsultations: async (req, res) => {
        try {
            const clientId = req.user._id;
            const consultations = await Consultation.find({ client: clientId })
                .populate('consultant', 'firstName lastName')
                .populate('service', 'name')
                .sort({ dateTime: -1 });

            res.status(200).json(consultations);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching client consultations', error: err.message });
        }
    },

    // Get consultations for a specific consultant
    getConsultantConsultations: async (req, res) => {
        try {
            const consultantId = req.user._id;
            const consultations = await Consultation.find({ consultant: consultantId })
                .populate('client', 'firstName lastName')
                .populate('service', 'name')
                .sort({ dateTime: -1 });

            res.status(200).json(consultations);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultant consultations', error: err.message });
        }
    },

    // Get a single consultation by ID
    getConsultationById: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('client', 'firstName lastName email')
                .populate('consultant', 'firstName lastName email')
                .populate('service', 'name');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            // Check if the user is authorized to view this consultation
            if (req.user.role === 'client' && consultation.client._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to view this consultation' });
            }
            if (req.user.role === 'consultant' && consultation.consultant._id.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to view this consultation' });
            }

            res.status(200).json(consultation);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultation', error: err.message });
        }
    },

    // Update a consultation
    updateConsultation: async (req, res) => {
        try {
            const { status, notes, followUpActions, recordingUrl } = req.body;
            const consultation = await Consultation.findById(req.params.id)
                .populate('client', 'email')
                .populate('consultant', 'email');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            // Check authorization
            if (req.user.role === 'consultant' && consultation.consultant.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this consultation' });
            }

            if (status) {
                consultation.status = status;
                consultation.statusHistory.push({
                    status,
                    changedAt: new Date(),
                    changedBy: req.user._id
                });

                // Send status update email
                await emailService.sendEmail(
                    consultation.client.email,
                    'Consultation Status Update',
                    'consultationStatusUpdate',
                    { consultationDetails: consultation, newStatus: status }
                );
            }
            if (notes) consultation.notes = notes;
            if (followUpActions) consultation.followUpActions = followUpActions;
            if (recordingUrl) consultation.recordingUrl = recordingUrl;

            await consultation.save();

            res.status(200).json({ message: 'Consultation updated successfully', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error updating consultation', error: err.message });
        }
    },

    // Cancel a consultation
    cancelConsultation: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('client', 'email')
                .populate('consultant', 'email');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            // Check if the user is authorized to cancel
            if (req.user.role === 'client' && consultation.client.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to cancel this consultation' });
            }

            consultation.status = 'cancelled';
            consultation.statusHistory.push({
                status: 'cancelled',
                changedAt: new Date(),
                changedBy: req.user._id
            });

            await consultation.save();

            // Send cancellation emails
            await emailService.sendEmail(
                consultation.client.email,
                'Consultation Cancelled',
                'consultationCancelled',
                { consultationDetails: consultation }
            );
            await emailService.sendEmail(
                consultation.consultant.email,
                'Consultation Cancelled',
                'consultationCancelled',
                { consultationDetails: consultation }
            );

            res.status(200).json({ message: 'Consultation cancelled successfully', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error cancelling consultation', error: err.message });
        }
    },


    // Reschedule a consultation
    rescheduleConsultation: async (req, res) => {
        try {
            const { newDateTime } = req.body;
            const consultation = await Consultation.findById(req.params.id)
                .populate('client', 'email')
                .populate('consultant', 'email');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            // Check authorization
            if (req.user.role === 'client' && consultation.client.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to reschedule this consultation' });
            }

            consultation.dateTime = new Date(newDateTime);
            consultation.status = 'rescheduled';
            consultation.statusHistory.push({
                status: 'rescheduled',
                changedAt: new Date(),
                changedBy: req.user._id
            });

            await consultation.save();

            // Send rescheduling emails
            await emailService.sendEmail(
                consultation.client.email,
                'Consultation Rescheduled',
                'consultationRescheduled',
                { consultationDetails: consultation }
            );
            await emailService.sendEmail(
                consultation.consultant.email,
                'Consultation Rescheduled',
                'consultationRescheduled',
                { consultationDetails: consultation }
            );

            res.status(200).json({ message: 'Consultation rescheduled successfully', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error rescheduling consultation', error: err.message });
        }
    },

    // Add feedback to a consultation
    addFeedback: async (req, res) => {
        try {
            const { rating, comment } = req.body;
            const consultation = await Consultation.findById(req.params.id);

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            // Check if the user is the client of this consultation
            if (consultation.client.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to add feedback to this consultation' });
            }

            consultation.feedback = { rating, comment };
            await consultation.save();

            res.status(200).json({ message: 'Feedback added successfully', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error adding feedback', error: err.message });
        }
    },

    // Mark consultation as completed
    markAsCompleted: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('client', 'email')
                .populate('consultant', 'email');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            // Check if the user is the consultant of this consultation
            if (consultation.consultant.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to mark this consultation as completed' });
            }

            consultation.status = 'completed';
            consultation.statusHistory.push({
                status: 'completed',
                changedAt: new Date(),
                changedBy: req.user._id
            });

            await consultation.save();

            // Send completion email to client
            await emailService.sendEmail(
                consultation.client.email,
                'Consultation Completed',
                'consultationCompleted',
                { consultationDetails: consultation }
            );

            res.status(200).json({ message: 'Consultation marked as completed', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error marking consultation as completed', error: err.message });
        }
    },

    // Get consultation statistics (Admin only)
    getConsultationStats: async (req, res) => {
        try {
            const stats = await Consultation.aggregate([
                {
                    $group: {
                        _id: null,
                        totalConsultations: { $sum: 1 },
                        averageRating: { $avg: '$feedback.rating' },
                        totalRevenue: { $sum: '$price' },
                        completedConsultations: { 
                            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
                        },
                        cancelledConsultations: { 
                            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
                        }
                    }
                }
            ]);

            res.status(200).json(stats[0] || { message: 'No statistics available' });
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultation statistics', error: err.message });
        }
    },

    // Generate consultation report (Admin only)
    generateConsultationReport: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                return res.status(400).json({ message: 'Start and end dates are required' });
            }

            const report = await Consultation.aggregate([
                {
                    $match: {
                        dateTime: {
                            $gte: new Date(startDate),
                            $lte: new Date(endDate)
                        }
                    }
                },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 },
                        totalRevenue: { $sum: '$price' }
                    }
                }
            ]);

            res.status(200).json({ report });
        } catch (err) {
            res.status(500).json({ message: 'Error generating consultation report', error: err.message });
        }
    }
};

module.exports = consultationController;