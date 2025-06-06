const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const contactController = require('../controllers/contactController');
const newsletterController = require('../controllers/newsletterController');

// Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
// Fix: Change from path parameter to query parameter
router.post('/reset-password', authController.resetPassword); // Changed from '/reset-password/:token'
router.get('/logout', authController.logout);

// Contact routes
router.post('/contact', contactController.submitContactForm);

// Newsletter routes
router.post('/newsletter/subscribe', newsletterController.subscribeToNewsletter);
router.post('/newsletter/unsubscribe', newsletterController.unsubscribeFromNewsletter);
router.get('/newsletter/stats', newsletterController.getNewsletterStats);

module.exports = router;
