const Consultation = require('../models/consultationModel');
const Client = require('../models/clientModel');
const Consultant = require('../models/consultantModel');
const Service = require('../models/serviceModel');
const mongoose = require('mongoose');

const consultationController = {
    // Create a new consultation
    manageConsultation: async (req, res) => {
        try {
            const { clientId, consultantId, serviceId, dateTime, duration, status } = req.body;
            
            // Validate input
            if (!clientId || !consultantId || !serviceId || !dateTime || !duration) {
                return res.status(400).json({ message: 'Missing required fields' });
            }

            // Check if client and consultant exist
            const [client, consultant] = await Promise.all([
                User.findById(clientId),
                User.findById(consultantId)
            ]);

            if (!client || client.role !== 'client') {
                return res.status(404).json({ message: 'Client not found' });
            }

            if (!consultant || consultant.role !== 'consultant') {
                return res.status(404).json({ message: 'Consultant not found' });
            }

            // Create or update consultation
            let consultation;
            if (req.params.id) {
                // If ID is provided, update existing consultation
                consultation = await Consultation.findByIdAndUpdate(
                    req.params.id,
                    { client: clientId, consultant: consultantId, service: serviceId, dateTime, duration, status },
                    { new: true, runValidators: true }
                );
                if (!consultation) {
                    return res.status(404).json({ message: 'Consultation not found' });
                }
            } else {
                // If no ID, create new consultation
                consultation = new Consultation({
                    client: clientId,
                    consultant: consultantId,
                    service: serviceId,
                    dateTime: new Date(dateTime),
                    duration,
                    status: status || 'scheduled'
                });
                await consultation.save();
            }

            res.status(201).json({ message: 'Consultation managed successfully', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error managing consultation', error: err.message });
        }
    },

    // Get all consultations with filtering and pagination
    getAllConsultations: async (req, res) => {
        try {
            const { page = 1, limit = 10, status, startDate, endDate, clientId, consultantId } = req.query;
            const query = {};

            if (status) query.status = status;
            if (clientId) query.client = clientId;
            if (consultantId) query.consultant = consultantId;
            if (startDate && endDate) {
                query.dateTime = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const consultations = await Consultation.find(query)
                .populate('client', 'firstName lastName email')
                .populate('consultant', 'firstName lastName email')
                .populate('service', 'name')
                .limit(limit * 1)
                .skip((page - 1) * limit)
                .sort({ dateTime: -1 })
                .exec();

            const count = await Consultation.countDocuments(query);

            res.status(200).json({
                consultations,
                totalPages: Math.ceil(count / limit),
                currentPage: page
            });
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultations', error: err.message });
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

            res.status(200).json(consultation);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching consultation', error: err.message });
        }
    },

    // Update a consultation
    updateConsultation: async (req, res) => {
        try {
            const { status, notes, followUpActions, recordingUrl, feedback, paymentStatus } = req.body;
            const updatedConsultation = await Consultation.findByIdAndUpdate(
                req.params.id,
                { 
                    status, 
                    notes, 
                    followUpActions, 
                    recordingUrl, 
                    feedback, 
                    paymentStatus,
                    $push: { 
                        statusHistory: { 
                            status: status, 
                            changedAt: new Date(), 
                            changedBy: req.user._id 
                        } 
                    }
                },
                { new: true, runValidators: true }
            );

            if (!updatedConsultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            res.status(200).json({ message: 'Consultation updated successfully', consultation: updatedConsultation });
        } catch (err) {
            res.status(500).json({ message: 'Error updating consultation', error: err.message });
        }
    },

    // Delete a consultation
    deleteConsultation: async (req, res) => {
        try {
            const deletedConsultation = await Consultation.findByIdAndDelete(req.params.id);

            if (!deletedConsultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            res.status(200).json({ message: 'Consultation deleted successfully' });
        } catch (err) {
            res.status(500).json({ message: 'Error deleting consultation', error: err.message });
        }
    },

    // Reschedule a consultation
    rescheduleConsultation: async (req, res) => {
        try {
            const { newDateTime } = req.body;
            if (!newDateTime) {
                return res.status(400).json({ message: 'New date and time are required' });
            }

            const consultation = await Consultation.findById(req.params.id);
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            consultation.dateTime = new Date(newDateTime);
            consultation.status = 'rescheduled';
            consultation.statusHistory.push({ 
                status: 'rescheduled', 
                changedAt: new Date(), 
                changedBy: req.user._id 
            });

            await consultation.save();

            res.status(200).json({ message: 'Consultation rescheduled successfully', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error rescheduling consultation', error: err.message });
        }
    },

    // Add feedback to a consultation
    addFeedback: async (req, res) => {
        try {
            const { rating, comment } = req.body;
            if (!rating) {
                return res.status(400).json({ message: 'Rating is required' });
            }

            const consultation = await Consultation.findById(req.params.id);
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            consultation.feedback = { rating, comment };
            await consultation.save();

            res.status(200).json({ message: 'Feedback added successfully', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error adding feedback', error: err.message });
        }
    },

    // Get consultations statistics
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

    // Get upcoming consultations
    getUpcomingConsultations: async (req, res) => {
        try {
            const upcomingConsultations = await Consultation.find({
                dateTime: { $gt: new Date() },
                status: { $nin: ['cancelled', 'completed'] }
            })
            .populate('client', 'firstName lastName email')
            .populate('consultant', 'firstName lastName email')
            .populate('service', 'name')
            .sort({ dateTime: 1 });

            res.status(200).json(upcomingConsultations);
        } catch (err) {
            res.status(500).json({ message: 'Error fetching upcoming consultations', error: err.message });
        }
    },

    // Mark consultation as no-show
    markAsNoShow: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id);
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            consultation.status = 'no-show';
            consultation.statusHistory.push({ 
                status: 'no-show', 
                changedAt: new Date(), 
                changedBy: req.user._id 
            });
            await consultation.save();

            res.status(200).json({ message: 'Consultation marked as no-show', consultation });
        } catch (err) {
            res.status(500).json({ message: 'Error marking consultation as no-show', error: err.message });
        }
    },

    // Generate report for consultations
    generateReport: async (req, res) => {
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
            res.status(500).json({ message: 'Error generating report', error: err.message });
        }
    }
};

module.exports = consultationController;