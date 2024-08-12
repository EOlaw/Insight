const express = require('express');
const router = express.Router();
const consultationControllers = require('../consult/controllers/consultationController');
const { isAuthenticated, isClient } = require('../auth/utils/userUtils');

// Consultation Routes
router.route('/create')
    .get(isAuthenticated, isClient, consultationControllers.renderConsultation)
    .post(isAuthenticated, isClient, consultationControllers.createConsultation)
router.route('/')
    .get(isAuthenticated, isClient, consultationControllers.getAllConsultations)

router.route('/:id')
    .get(isAuthenticated, consultationControllers.getConsultationById)
    .put(isAuthenticated, consultationControllers.updateConsultation)
    .delete(isAuthenticated, consultationControllers.deleteConsultation)

module.exports = router;