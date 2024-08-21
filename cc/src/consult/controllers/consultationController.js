const Consultation = require('../models/consultationModel');
const Client = require('../models/clientModel');
const Consultant = require('../models/consultantModel');
const Service = require('../models/serviceModel');
const User = require('../../auth/models/userModel');
const { calculatePrice, createPaymentIntent, confirmPaymentIntent } = require('../../utils/payment');
const emailService = require('../../utils/emailService'); // Assuming you have an email service
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const consultationController = {
    // Render the consultation creation form
    renderCreateForm: async (req, res) => {
        try {
            const services = await Service.find();
            const consultants = await Consultant.find().populate('user', 'firstName lastName');
            res.render('consultations/create', { services, consultants });
        } catch (err) {
            console.error('Error rendering create form:', err);
            res.status(500).render('error', { message: 'Error loading create consultation form' });
        }
    },

    // Create a new consultation (without payment)
    createConsultation: async (req, res) => {
        try {
            const { consultantId, serviceId, specialization, dateTime, duration, selectedOptions } = req.body;
            const clientId = req.user._id;

            const [service, consultant, client] = await Promise.all([
                Service.findById(serviceId),
                Consultant.findById(consultantId).populate('user', 'firstName lastName'),
                Client.findOne({ user: clientId }).populate('user', 'email firstName lastName')
            ]);

            if (!service || !consultant || !client) {
                return res.status(404).render('error', { message: 'Service, consultant, or client not found' });
            }

            if (!service.specializations.includes(specialization) || !consultant.specializations.includes(specialization)) {
                return res.status(400).render('error', { message: 'Invalid specialization for the selected service or consultant' });
            }

            const totalPrice = service.calculateTotalPrice(selectedOptions, duration);

            const newConsultation = new Consultation({
                client: client._id,
                consultant: consultantId,
                service: serviceId,
                specialization,
                dateTime,
                duration,
                price: totalPrice,
                selectedOptions,
                status: 'pending_payment',
                statusHistory: [{ status: 'pending_payment', changedAt: new Date(), changedBy: clientId }]
            });
    
            await newConsultation.save();

            // Update client's consultationHistory
            client.consultationHistory.push(newConsultation._id);
            await client.save();

            // Send payment waiting notification email
            try {
                await emailService.sendPaymentWaitingNotification(client.user, newConsultation);
            } catch (emailError) {
                console.error('Error sending payment waiting notification email:', emailError);
            }

            // Redirect to the payment page
            res.redirect(`/consultation/${newConsultation._id}/payment`);
        } catch (err) {
            console.error('Error in createConsultation:', err);
            res.status(500).render('error', { message: 'An unexpected error occurred. Please try again.' });
        }
    },

    // Render the payment page for a consultation
    renderPaymentPage: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('consultant', 'firstName lastName')
                .populate('service', 'name currency');
            
            if (!consultation) {
                return res.status(404).render('error', { message: 'Consultation not found' });
            }

            res.render('consultations/payment', { 
                consultation, 
                stripePublicKey: process.env.STRIPE_PUBLIC_KEY
            });
        } catch (err) {
            console.error('Error rendering payment page:', err);
            res.status(500).render('error', { message: 'Error loading payment page' });
        }
    },

    // Process payment for a consultation
    processPayment: async (req, res) => {
        console.log('processPayment called');
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('consultant', 'firstName lastName')
                .populate('service', 'name currency');
    
            if (!consultation) {
                return res.status(404).json({ success: false, error: 'Consultation not found' });
            }
    
            if (consultation.status !== 'pending_payment') {
                return res.status(400).json({ success: false, error: 'Invalid consultation status for payment' });
            }
    
            const amount = Math.round(consultation.price * 100); // Convert to cents
    
            if (amount <= 0) {
                return res.status(400).json({ success: false, error: 'Invalid payment amount' });
            }
    
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: consultation.service.currency.toLowerCase(),
                metadata: { consultationId: consultation._id.toString() },
                automatic_payment_methods: { enabled: true },
            });
    
            console.log('PaymentIntent created:', paymentIntent.id);
    
            // Update the consultation with the PaymentIntent ID
            consultation.paymentIntentId = paymentIntent.id;
            await consultation.save();
    
            res.json({
                clientSecret: paymentIntent.client_secret,
                amount: amount,
                currency: consultation.service.currency.toLowerCase()
            });
        } catch (err) {
            console.error('Error in processPayment:', err);
            res.status(500).json({ success: false, error: err.message || 'Error processing payment' });
        }
    },
    
    // Confirm payment and update consultation status
    confirmPayment: async (req, res) => {
        try {
            const { paymentIntentId } = req.body;
            const consultation = await Consultation.findOne({ paymentIntentId: paymentIntentId });
    
            if (!consultation) {
                return res.status(404).json({ success: false, error: 'Consultation not found' });
            }
    
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
            if (paymentIntent.status === 'succeeded') {
                consultation.status = 'completed';
                consultation.statusHistory.push({
                    status: 'completed',
                    changedAt: new Date(),
                    changedBy: req.user._id
                });
                await consultation.save();
    
                // Send confirmation emails
                try {
                    await emailService.sendConsultationConfirmation(consultation);
                } catch (emailError) {
                    console.error('Error sending confirmation email:', emailError);
                }
    
                res.json({ success: true, message: 'Payment confirmed and consultation updated' });
            } else {
                res.json({ success: false, error: 'Payment confirmation failed' });
            }
        } catch (err) {
            console.error('Error confirming payment:', err);
            res.status(500).json({ success: false, error: err.message || 'Error confirming payment' });
        }
    },
    

    // Render the consultation confirmation page
    renderConfirmationPage: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('consultant', 'firstName lastName')
                .populate('service', 'name currency');
            
            if (!consultation) {
                return res.status(404).render('error', { message: 'Consultation not found' });
            }

            res.render('consultations/confirmation', { consultation });
        } catch (err) {
            console.error('Error rendering confirmation page:', err);
            res.status(500).render('error', { message: 'Error loading confirmation page' });
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