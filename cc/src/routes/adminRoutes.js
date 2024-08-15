const express = require('express');
const router = express.Router();
const adminControllers = require('../admin/adminController');
const { authorizeAdmin } = require('../auth/utils/userUtils'); // Assume you have this middleware

router.post('/verify-consultant', authorizeAdmin, adminControllers.verifyConsultant);

module.exports = router;