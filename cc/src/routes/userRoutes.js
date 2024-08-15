const express = require('express');
const router = express.Router();
const passport = require('passport')
const userController = require('../auth/controllers/userController');
const { isAuthenticated } = require('../auth/utils/userUtils');


// User Profile
router.route('/register')
    .post(userController.registerUser)
    .get(userController.renderRegister)

router.route('/login')
    .get(userController.renderLogin)
    .post(passport.authenticate('local', { failureFlash: true, failureRedirect: '/user/login' }), userController.loginUser);

router.get('/logout', isAuthenticated, userController.logoutUser);
router.get('/profile', isAuthenticated, userController.getUserProfile);

router.route('/:id')
    // .get(isAuthenticated, userControllers.getUser)
    .put(isAuthenticated, userController.updateUserAccount)
    .delete(isAuthenticated, userController.deleteUserAccount)

module.exports = router;