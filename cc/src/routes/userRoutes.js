const express = require('express');
const router = express.Router();
const userController = require('../auth/controllers/userController');
const { isAuthenticated } = require('../auth/utils/userUtils');

router.get('/register', userController.renderRegister);
router.post('/register', userController.registerUser);
router.get('/login', userController.renderLogin);
router.post('/login', userController.loginUser);
router.get('/logout', isAuthenticated, userController.logoutUser);
router.get('/profile', isAuthenticated, userController.getUserProfile);
router.put('/profile', isAuthenticated, userController.updateUserProfile);

module.exports = router;