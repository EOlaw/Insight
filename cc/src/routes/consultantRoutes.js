const express = require('express');
const router = express.Router();
const consultantController = require('../consult/controllers/consultantController');
const { isAuthenticated, authorizeConsultant } = require('../auth/utils/userUtils');

router.get('/profile', isAuthenticated, authorizeConsultant, consultantController.getConsultantProfile);
router.put('/profile', isAuthenticated, authorizeConsultant, consultantController.updateConsultantProfile);
router.get('/consultations', isAuthenticated, authorizeConsultant, consultantController.getConsultantConsultations);
router.get('/availability', isAuthenticated, authorizeConsultant, consultantController.getConsultantAvailability);
router.put('/availability', isAuthenticated, authorizeConsultant, consultantController.updateConsultantAvailability);

module.exports = router;