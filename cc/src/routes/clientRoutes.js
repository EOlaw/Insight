const express = require('express');
const router = express.Router();
const clientControllers = require('../consult/controllers/clientController');
const { isAuthenticated, isClient } = require('../auth/utils/userUtils');


// Client Routes
router.route('/')
    .get(isAuthenticated, isClient, clientControllers.getClientProfile)

// Render Edit Profile Form
router.route('/edit')
    .get(isAuthenticated, isClient, clientControllers.renderEditProfileForm)
    .put(isAuthenticated, isClient, clientControllers.updateClientProfile);

router.route('/rate')
    .post(isAuthenticated, isClient, clientControllers.addRating)
    .put(isAuthenticated, isClient, clientControllers.updateRating)

module.exports = router;