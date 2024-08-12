const express = require('express');
const router = express.Router();
const consultationController = require('../consult/controllers/consultationController');
const { isAuthenticated } = require('../auth/utils/userUtils');

router.get('/:consultationId', isAuthenticated, consultationController.getConsultationDetails);
router.put('/:consultationId/notes', isAuthenticated, consultationController.updateConsultationNotes);
router.put('/:consultationId/complete', isAuthenticated, consultationController.completeConsultation);
// router.post('/:consultationId/feedback', isAuthenticated, consultationController.provideFeedback);

module.exports = router;