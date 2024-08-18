const express = require('express');
const router = express.Router();
const consultationController = require('../consult/controllers/consultationController');
const { isAuthenticated, authorizeClient, authorizeConsultant, authorizeAdmin } = require('../auth/utils/userUtils');


// Routes accessible by authenticated clients
router.post('/book', isAuthenticated, authorizeClient, consultationController.createConsultation);
router.get('/client', isAuthenticated, authorizeClient, consultationController.getClientConsultations);
router.post('/:id/feedback', isAuthenticated, authorizeClient, consultationController.addFeedback);

// Routes accessible by authenticated consultants
router.get('/consultant', isAuthenticated, authorizeConsultant, consultationController.getConsultantConsultations);
router.put('/:id/complete', isAuthenticated, authorizeConsultant, consultationController.markAsCompleted);

// Routes accessible by both clients and consultants
router.get('/:id', isAuthenticated, consultationController.getConsultationById);
router.put('/:id', isAuthenticated, consultationController.updateConsultation);
router.post('/:id/reschedule', isAuthenticated, consultationController.rescheduleConsultation);
router.post('/:id/cancel', isAuthenticated, consultationController.cancelConsultation);

// Routes accessible only by admins
router.get('/', isAuthenticated, authorizeAdmin, consultationController.getAllConsultations);
router.get('/stats', isAuthenticated, authorizeAdmin, consultationController.getConsultationStats);
router.get('/report', isAuthenticated, authorizeAdmin, consultationController.generateConsultationReport);

module.exports = router;