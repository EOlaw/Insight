const express = require('express');
const router = express.Router();
const consultationController = require('../consult/controllers/consultationController');
const { isAuthenticated, authorizeConsultant } = require('../auth/utils/userUtils');
const { checkConsultantVerification } = require('../consult/utils/consultantMiddleware')

router.get('/:consultationId', isAuthenticated, consultationController.getConsultationDetails);
router.put('/:consultationId/notes', isAuthenticated, authorizeConsultant, consultationController.updateConsultationNotes);
router.put('/:consultationId/complete', isAuthenticated, authorizeConsultant, consultationController.completeConsultation);
// router.post('/:consultationId/feedback', isAuthenticated, consultationController.provideFeedback);

module.exports = router;