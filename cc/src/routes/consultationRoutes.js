const express = require('express');
const router = express.Router();
const consultationController = require('../consult/controllers/consultationController');
const { isAuthenticated, authorizeAdminOrDeveloper} = require('../auth/utils/userUtils');


// Create a new consultation
router.post('/manage', isAuthenticated, authorizeAdminOrDeveloper, consultationController.manageConsultation);
router.put('/manage/:id', isAuthenticated, authorizeAdminOrDeveloper, consultationController.manageConsultation);


// Get all consultations (with filtering and pagination)
router.get('/', isAuthenticated, authorizeAdminOrDeveloper, consultationController.getAllConsultations);

// Get a single consultation by ID
router.get('/:id', isAuthenticated, consultationController.getConsultationById);

// Update a consultation
router.put('/:id', isAuthenticated, authorizeAdminOrDeveloper, consultationController.updateConsultation);

// Delete a consultation
router.delete('/:id', isAuthenticated, authorizeAdminOrDeveloper, consultationController.deleteConsultation);

// Reschedule a consultation
router.put('/:id/reschedule', isAuthenticated, authorizeAdminOrDeveloper, consultationController.rescheduleConsultation);

// Add feedback to a consultation
router.post('/:id/feedback', isAuthenticated, consultationController.addFeedback);

// Get consultation statistics
router.get('/stats/overview', isAuthenticated, authorizeAdminOrDeveloper, consultationController.getConsultationStats);

// Get upcoming consultations
router.get('/upcoming', isAuthenticated, consultationController.getUpcomingConsultations);

// Mark consultation as no-show
router.put('/:id/no-show', isAuthenticated, authorizeAdminOrDeveloper, consultationController.markAsNoShow);

// Generate report for consultations
router.get('/report', isAuthenticated, authorizeAdminOrDeveloper, consultationController.generateReport);

module.exports = router;