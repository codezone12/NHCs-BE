const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const contactController = require('../controllers/contactController');

// Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/logout', authController.logout);

// Contact routes
router.post('/contact', contactController.submitContactForm);

module.exports = router;
