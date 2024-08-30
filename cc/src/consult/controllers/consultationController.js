const Consultation = require('../models/consultationModel');
const Client = require('../models/clientModel');
const Consultant = require('../models/consultantModel');
const Service = require('../models/serviceModel');
const User = require('../../auth/models/userModel');
const { 
    calculatePrice, 
    createPaymentIntent, 
    confirmPaymentIntent, 
    processPayment,
    processRefund,
    generateInvoice,
    isHoliday,
    getSeasonalFactor,
    getDemandFactor,
    getLoyaltyDiscount,
    getUrgencyFee
} = require('../../utils/payment');
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

    // Update the createConsultation function
    createConsultation: async (req, res) => {
        console.log('createConsultation function called');
        console.log('Request body:', req.body);
        try {
            const { consultantId, serviceId, specialization, dateTime, duration, selectedOptions } = req.body;
            const clientId = req.user._id;

            console.log('Fetching service, consultant, and client');
            const [service, consultant, client] = await Promise.all([
                Service.findById(serviceId),
                Consultant.findById(consultantId).populate('user', 'firstName lastName'),
                Client.findOne({ user: clientId }).populate('user', 'email firstName lastName')
            ]);

            if (!service || !consultant || !client) {
                console.log('Service, consultant, or client not found');
                return res.status(404).render('error', { message: 'Service, consultant, or client not found' });
            }

            if (!service.specializations.includes(specialization) || !consultant.specializations.includes(specialization)) {
                console.log('Invalid specialization');
                return res.status(400).render('error', { message: 'Invalid specialization for the selected service or consultant' });
            }

            console.log('Calculating price');
            const { finalPrice, appliedFactors, currency } = calculatePrice(
                service, 
                duration, 
                selectedOptions, 
                consultant, 
                new Date(dateTime), 
                client
            );

            console.log('Creating new consultation');
            const newConsultation = new Consultation({
                client: client._id,
                consultant: consultantId,
                service: serviceId,
                specialization,
                dateTime,
                duration,
                price: finalPrice,
                finalPrice: finalPrice,
                currency: currency,
                selectedOptions,
                status: 'pending_payment',
                statusHistory: [{ status: 'pending_payment', changedAt: new Date(), changedBy: clientId }],
                appliedPriceFactors: appliedFactors
            });

            console.log('Saving consultation');
            await newConsultation.save();

            console.log('Updating client and consultant history');
            client.consultationHistory.push(newConsultation._id);
            await client.save();
            consultant.consultationHistory.push(newConsultation._id);
            await consultant.save();

            console.log('Sending email notification');
            try {
                await emailService.sendPaymentWaitingNotification(client.user, {
                    ...newConsultation.toObject(),
                    _id: newConsultation._id,
                    serviceName: service.name,
                    currency: currency,
                    consultantName: `${consultant.user.firstName} ${consultant.user.lastName}`,
                    dateTime: newConsultation.dateTime,
                    duration: newConsultation.duration,
                    price: newConsultation.price,
                    finalPrice: newConsultation.finalPrice,
                    appliedFactors: appliedFactors
                });
            } catch (emailError) {
                console.error('Error sending payment waiting notification email:', emailError);
            }

            console.log('Redirecting to payment page');
            res.redirect(`/consultation/${newConsultation._id}/payment`);
        } catch (err) {
            console.error('Error in createConsultation:', err);
            res.status(500).render('error', { message: 'An unexpected error occurred. Please try again.' });
        }
    },


    // Render the payment page for a consultation
    renderPaymentPage: async (req, res) => {
        try {
            console.log('Fetching consultation data');
            const consultation = await Consultation.findById(req.params.id)
                .populate({
                    path: 'consultant',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName'
                    }
                })
                .populate('service', 'name currency')
                .populate('client');
    
            if (!consultation) {
                console.log('Consultation not found');
                return res.status(404).render('error', { message: 'Consultation not found', statusCode: 404 });
            }
    
            console.log('Consultation data:', consultation);
    
            console.log('Rendering payment page');
            res.render('consultations/payment', { 
                consultation, 
                stripePublicKey: process.env.STRIPE_PUBLIC_KEY
            });
        } catch (err) {
            console.error('Error rendering payment page:', err);
            res.status(500).render('error', { message: 'Error loading payment page', statusCode: 500 });
        }
    },
    
    // Process payment for a consultation
    processPayment: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate({
                    path: 'consultant',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName'
                    }
                })
                .populate('service', 'name currency')
                .populate('client');
    
            if (!consultation) {
                return res.status(404).json({ success: false, error: 'Consultation not found' });
            }
    
            if (consultation.status !== 'pending_payment') {
                return res.status(400).json({ success: false, error: 'Invalid consultation status for payment' });
            }
    
            // Ensure the amount is in cents and above the minimum charge amount
            const amount = Math.max(Math.round(consultation.finalPrice * 100), 50); // 50 cents is the minimum for most currencies
            console.log('Amount to be charged (in cents):', amount);
    
            if (amount <= 0) {
                return res.status(400).json({ success: false, error: 'Invalid payment amount' });
            }
    
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: consultation.currency.toLowerCase(),
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
                currency: consultation.currency.toLowerCase()
            });
        } catch (err) {
            console.error('Error in processPayment:', err);
            res.status(500).json({ success: false, error: err.message || 'Error processing payment' });
        }
    },

    // Add a new function for refunds
    processRefund: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('service', 'currency');
    
            if (!consultation) {
                return res.status(404).json({ success: false, error: 'Consultation not found' });
            }
    
            if (consultation.status !== 'cancelled') {
                return res.status(400).json({ success: false, error: 'Consultation must be cancelled before refund' });
            }
    
            const refundResult = await processRefund(
                consultation.paymentIntentId,
                consultation.price * 100, // Convert to cents
                'Consultation cancelled',
                consultation.service.currency
            );
    
            if (refundResult.success) {
                consultation.status = 'refunded';
                consultation.statusHistory.push({
                    status: 'refunded',
                    changedAt: new Date(),
                    changedBy: req.user._id
                });
                await consultation.save();
    
                // Send refund confirmation email
                try {
                    await emailService.sendRefundConfirmation(consultation.client.user, {
                        consultationDetails: consultation,
                        refundAmount: refundResult.amount / 100,
                        currency: refundResult.currency
                    });
                } catch (emailError) {
                    console.error('Error sending refund confirmation email:', emailError);
                }
    
                res.json({
                    success: true,
                    message: 'Refund processed successfully',
                    refundId: refundResult.refundId,
                    amount: refundResult.amount / 100,
                    currency: refundResult.currency
                });
            } else {
                res.status(400).json({ success: false, error: refundResult.error });
            }
        } catch (err) {
            console.error('Error processing refund:', err);
            res.status(500).json({ success: false, error: err.message || 'Error processing refund' });
        }
    },
    
    // Confirm payment and update consultation status
    confirmPayment: async (req, res) => {
        console.log('confirmPayment function called');
        console.log('confirmPayment function called');
        try {
            const { paymentIntentId } = req.body;
            console.log('Received paymentIntentId:', paymentIntentId);

            if (!paymentIntentId) {
                return res.status(400).json({ success: false, error: 'Payment Intent ID is required' });
            }

            const consultation = await Consultation.findOne({ paymentIntentId: paymentIntentId })
                .populate({
                    path: 'consultant',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName'
                    }
                })
                .populate('service', 'name currency')
                .populate('client');

            if (!consultation) {
                console.log('Consultation not found for paymentIntentId:', paymentIntentId);
                return res.status(404).json({ success: false, error: 'Consultation not found' });
            }

            console.log('Consultation found:', consultation._id);

            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
            console.log('PaymentIntent retrieved:', paymentIntent.status);

            if (paymentIntent.status === 'succeeded') {
                consultation.status = 'scheduled';
                consultation.statusHistory.push({
                    status: 'scheduled',
                    changedAt: new Date(),
                    changedBy: req.user._id
                });
                await consultation.save();
                console.log('Consultation updated to scheduled');

                // Fetch client details
                const client = await Client.findById(consultation.client).populate('user', 'email firstName lastName');

                // Send confirmation emails
                try {
                    await emailService.sendConsultationConfirmation(client.user, {
                        consultationDetails: consultation,
                        consultantName: `${consultation.consultant.user.firstName} ${consultation.consultant.user.lastName}`,
                        serviceName: consultation.service.name
                    });

                    console.log('Confirmation email sent successfully');
                } catch (emailError) {
                    console.error('Error sending confirmation email:', emailError);
                }

                res.json({ success: true, message: 'Payment confirmed and consultation scheduled' });
            } else {
                console.log('PaymentIntent not succeeded:', paymentIntent.status);
                res.status(400).json({ success: false, error: 'Payment confirmation failed', status: paymentIntent.status });
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
                .populate({
                    path: 'consultant',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName'
                    }
                })
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

    // Update the cancelConsultation function
    cancelConsultation: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('client', 'email')
                .populate('consultant', 'email')
                .populate('service', 'name currency');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            // Check cancellation policy
            const currentTime = new Date();
            const consultationTime = new Date(consultation.dateTime);
            const hoursDifference = (consultationTime - currentTime) / (1000 * 60 * 60);

            let refundAmount = 0;
            if (hoursDifference >= 48) {
                refundAmount = consultation.price; // Full refund
            } else if (hoursDifference >= 24) {
                refundAmount = consultation.price * 0.5; // 50% refund
            }

            consultation.status = 'cancelled';
            consultation.statusHistory.push({
                status: 'cancelled',
                changedAt: new Date(),
                changedBy: req.user._id
            });

            await consultation.save();

            // Process refund if applicable
            if (refundAmount > 0) {
                const refundResult = await processRefund(
                    consultation.paymentIntentId,
                    refundAmount * 100, // Convert to cents
                    'Consultation cancelled',
                    consultation.service.currency
                );

                if (refundResult.success) {
                    consultation.status = 'refunded';
                    consultation.statusHistory.push({
                        status: 'refunded',
                        changedAt: new Date(),
                        changedBy: req.user._id
                    });
                    await consultation.save();
                }
            }

            // Send cancellation emails
            await emailService.sendEmail(
                consultation.client.email,
                'Consultation Cancelled',
                'consultationCancelled',
                { 
                    consultationDetails: consultation,
                    refundAmount: refundAmount,
                    currency: consultation.service.currency
                }
            );
            await emailService.sendEmail(
                consultation.consultant.email,
                'Consultation Cancelled',
                'consultationCancelled',
                { 
                    consultationDetails: consultation,
                    refundAmount: refundAmount,
                    currency: consultation.service.currency
                }
            );

            res.status(200).json({ 
                message: 'Consultation cancelled successfully', 
                consultation,
                refundAmount: refundAmount,
                currency: consultation.service.currency
            });
        } catch (err) {
            res.status(500).json({ message: 'Error cancelling consultation', error: err.message });
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
                .populate({
                    path: 'client',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName profile'
                    }
                })
                .populate({
                    path: 'consultant',
                    populate: {
                        path: 'user',
                        select: 'firstName lastName profile'
                    }
                })
                .populate('service', 'name')
                .populate({
                    path: 'notes.author',
                    select: 'firstName lastName profile'
                })
                .lean();
    
            if (!consultation) {
                return res.status(404).render('error', { message: 'Consultation not found' });
            }
    
            // Calculate unread notes count, excluding notes sent by the current user
            const unreadNotesCount = consultation.notes.filter(note => 
                note.author._id.toString() !== req.user._id.toString() && 
                !note.readBy.some(id => id.toString() === req.user._id.toString())
            ).length;
    
            // Fetch related consultations
            const relatedConsultations = await consultationController.getRelatedConsultations(consultation);
    
            // Fetch the current user's full profile information
            const currentUser = await User.findById(req.user._id).select('firstName lastName profile').lean();
    
            res.render('consultations/details', {
                consultation: consultation,
                unreadNotesCount: unreadNotesCount,
                relatedConsultations: relatedConsultations,
                currentUser: currentUser
            });
        } catch (err) {
            console.error('Error fetching consultation:', err);
            res.status(500).render('error', { message: 'Error fetching consultation' });
        }
    },

    // Add notes to a consultation
    addNotes: async (req, res) => {
        try {
            const { noteText } = req.body;
            const consultation = await Consultation.findById(req.params.id)
                .populate('client', 'user')
                .populate('consultant', 'user');
    
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }
    
            // Check authorization
            if (
                (req.user.role === 'client' && consultation.client.user.toString() !== req.user._id.toString()) ||
                (req.user.role === 'consultant' && consultation.consultant.user.toString() !== req.user._id.toString())
            ) {
                return res.status(403).json({ message: 'Not authorized to add notes to this consultation' });
            }
    
            // Create a new note object
            const newNote = {
                text: noteText,
                author: req.user._id,
                authorRole: req.user.role,
                sender: req.user._id,
                createdAt: new Date(),
                readBy: [req.user._id] // Mark as read for the sender
            };
    
            // Add the new note to the consultation's notes array
            if (!consultation.notes) {
                consultation.notes = [];
            }
            consultation.notes.push(newNote);
    
            await consultation.save();
    
            res.status(200).json({ message: 'Note added successfully', consultation });
        } catch (err) {
            console.error('Error adding note:', err);
            res.status(500).json({ message: 'Error adding note', error: err.message });
        }
    },

    // Get notes for a consultation
    getNotes: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('client', 'user')
                .populate('consultant', 'user')
                .populate('notes.author', 'firstName lastName');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            // Check authorization
            if (
                (req.user.role === 'client' && consultation.client.user.toString() !== req.user._id.toString()) ||
                (req.user.role === 'consultant' && consultation.consultant.user.toString() !== req.user._id.toString())
            ) {
                return res.status(403).json({ message: 'Not authorized to view notes for this consultation' });
            }

            res.status(200).json({ notes: consultation.notes });
        } catch (err) {
            console.error('Error fetching notes:', err);
            res.status(500).json({ message: 'Error fetching notes', error: err.message });
        }
    },

    // Mark notes as read
    markNotesAsRead: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id);
            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            consultation.notes.forEach(note => {
                if (note.author.toString() !== req.user._id.toString() && 
                    !note.readBy.includes(req.user._id)) {
                    note.readBy.push(req.user._id);
                }
            });

            await consultation.save();
            res.status(200).json({ message: 'Notes marked as read' });
        } catch (err) {
            console.error('Error marking notes as read:', err);
            res.status(500).json({ message: 'Error marking notes as read' });
        }
    },

    // Get related consultations
    getRelatedConsultations: async (consultation) => {
        try {
            const relatedConsultations = await Consultation.find({
                $or: [
                    { client: consultation.client._id },
                    { consultant: consultation.consultant._id },
                    { service: consultation.service._id }
                ],
                _id: { $ne: consultation._id }
            })
            .sort({ dateTime: -1 })
            .limit(3)
            .populate('service', 'name')
            .lean();

            return relatedConsultations;
        } catch (err) {
            console.error('Error fetching related consultations:', err);
            return [];
        }
    },

    // Unified sendMessage function
    sendMessage: async (req, res) => {
        try {
            const { message } = req.body;
            const consultation = await Consultation.findById(req.params.id)
                .populate({
                    path: 'consultant',
                    populate: { path: 'user', select: 'firstName lastName email' }
                })
                .populate({
                    path: 'client',
                    populate: { path: 'user', select: 'firstName lastName email' }
                })
                .populate('service', 'name');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
            }

            let sender, recipient, senderName, recipientName;

            if (req.user.role === 'client' && consultation.client.user._id.toString() === req.user._id.toString()) {
                sender = consultation.client.user;
                recipient = consultation.consultant.user;
                senderName = `${sender.firstName} ${sender.lastName}`;
                recipientName = `${recipient.firstName} ${recipient.lastName}`;
                await emailService.sendClientMessageToConsultant(recipient, senderName, message, consultation);
            } else if (req.user.role === 'consultant' && consultation.consultant.user._id.toString() === req.user._id.toString()) {
                sender = consultation.consultant.user;
                recipient = consultation.client.user;
                senderName = `${sender.firstName} ${sender.lastName}`;
                recipientName = `${recipient.firstName} ${recipient.lastName}`;
                await emailService.sendConsultantMessageToClient(recipient, senderName, message, consultation);
            } else {
                return res.status(403).json({ message: 'Not authorized to send messages for this consultation' });
            }

            res.status(200).json({ message: `Message sent successfully to ${recipientName}` });
        } catch (err) {
            console.error('Error sending message:', err);
            res.status(500).json({ message: 'Error sending message', error: err.message });
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

    /*
    // Cancel a consultation
    cancelConsultation: async (req, res) => {
        try {
            const consultation = await Consultation.findById(req.params.id)
                .populate('client', 'email')
                .populate('consultant', 'email');

            if (!consultation) {
                return res.status(404).json({ message: 'Consultation not found' });
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
    */

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