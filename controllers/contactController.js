// controllers/contactController.js
const { sendContactFormEmail, sendContactAcknowledgementEmail } = require('../utils/email');

/**
 * Handle contact form submission
 * @route POST /api/contact
 */
exports.submitContactForm = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;
    
    // Validate required fields
    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    const contactData = {
      firstName,
      lastName,
      email,
      phone,
      message
    };
    
    // Send both emails concurrently for better performance
    await Promise.all([
      // Send email to admin
      sendContactFormEmail(contactData),
      // Send acknowledgement email to user
      sendContactAcknowledgementEmail(contactData)
    ]);
    
    res.status(200).json({
      success: true,
      message: `Dear ${firstName}, Your message has been sent successfully. You will receive a confirmation email shortly.`
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    
    // Check if it's an email sending error
    if (error.code === 'EAUTH' || error.code === 'ECONNECTION') {
      return res.status(500).json({
        success: false,
        message: 'Email service is currently unavailable. Please try again later.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error sending your message. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};