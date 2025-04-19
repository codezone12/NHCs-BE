const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Sample route
router.get('/', (req, res) => {
  res.send('Welcome to the API');
});

// Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password/:token', authController.resetPassword);
router.get('/logout', authController.logout);

module.exports = router;
