// controllers/contactController.js
const { sendContactFormEmail } = require('../utils/email');

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
    
    // Send email to admin
    await sendContactFormEmail({
      firstName,
      lastName,
      email,
      phone,
      message
    });
    
    res.status(200).json({
      success: true,
      message: 'Your message has been sent successfully'
    });
  } catch (error) {
    console.error('Contact form submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending your message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};