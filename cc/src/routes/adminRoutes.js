const express = require('express');
const router = express.Router();
const adminControllers = require('../admin/adminController');
const { isAuthenticated, authorizeAdmin } = require('../auth/utils/userUtils');

// Apply authentication and admin authorization to all routes
router.use(isAuthenticated, authorizeAdmin);

// Dashboard
router.get('/dashboard', adminControllers.viewSystemStats);

// Users
router.get('/users', adminControllers.renderUsers);
router.post('/users', adminControllers.manageUsers);

// Services
router.get('/services', adminControllers.renderServices);
router.post('/services', adminControllers.manageServices);

// Consultations
router.get('/consultations', adminControllers.renderConsultations);
router.post('/consultations', adminControllers.manageConsultations);

// Reports
router.get('/reports', adminControllers.renderReports);
router.post('/reports', adminControllers.generateReports);

// Main admin panel route
router.get('/', adminControllers.renderAdminPanel);

// Partial content route
router.get('/content/:section', adminControllers.getAdminContent);

module.exports = router;