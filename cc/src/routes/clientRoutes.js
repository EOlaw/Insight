const express = require('express');
const router = express.Router();
const clientController = require('../consult/controllers/clientController');
const { isAuthenticated, authorizeClient } = require('../auth/utils/userUtils');

router.get('/profile', isAuthenticated, authorizeClient, clientController.getClientProfile);
router.put('/profile', isAuthenticated, authorizeClient, clientController.updateClientProfile);
router.get('/consultations', isAuthenticated, authorizeClient, clientController.getClientConsultations);
router.post('/book-consultation', isAuthenticated, authorizeClient, clientController.bookConsultation);
router.put('/cancel-consultation/:consultationId', isAuthenticated, authorizeClient, clientController.cancelConsultation);

module.exports = router;