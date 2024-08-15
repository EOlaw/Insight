const express = require('express');
const router = express.Router();
const serviceController = require('../consult/controllers/serviceController');
const { isAuthenticated, authorizeAdminOrDeveloper} = require('../auth/utils/userUtils');
// Apply isAuthenticated and authorizeAdminOrDeveloper middleware to all routes
router.use(isAuthenticated, authorizeAdminOrDeveloper);

// Create a new service
router.post('/', serviceController.createService);

// Get all services
router.get('/', serviceController.getAllServices);

// Get a single service by ID
router.get('/:id', serviceController.getServiceById);

// Update a service
router.put('/:id', serviceController.updateService);

// Delete a service
router.delete('/:id', serviceController.deleteService);

// Toggle service active status
router.patch('/:id/toggle-status', serviceController.toggleServiceStatus);

// Get services by category
router.get('/category/:category', serviceController.getServicesByCategory);

// Search services
router.get('/search', serviceController.searchServices);

module.exports = router;