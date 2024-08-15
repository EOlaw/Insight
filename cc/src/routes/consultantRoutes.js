const express = require('express');
const router = express.Router();
const consultantController = require('../consult/controllers/consultantController');
const { isAuthenticated, authorizeConsultant } = require('../auth/utils/userUtils');


router.get('/', isAuthenticated, authorizeConsultant, consultantController.getConsultantProfile);
// Render Edit Profile Form
router.route('/edit')
    .get(isAuthenticated, authorizeConsultant, consultantController.renderEditProfile)
    .put(isAuthenticated, authorizeConsultant, consultantController.updateConsultantProfile);

router.get('/consultations', isAuthenticated, authorizeConsultant, consultantController.getConsultantConsultations);
router.get('/availability', isAuthenticated, authorizeConsultant, consultantController.getConsultantAvailability);
router.put('/availability', isAuthenticated, authorizeConsultant, consultantController.updateConsultantAvailability);

router.put('/pick-consultation/:consultationId', isAuthenticated, authorizeConsultant, consultantController.pickConsultation);
router.get('/available-consultations', isAuthenticated, authorizeConsultant, consultantController.getConsultationsView);

module.exports = router;