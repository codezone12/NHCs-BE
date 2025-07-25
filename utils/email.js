// utils/emailService.js
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false  // Added for compatibility
  }
});

// Read and compile email templates
const compileTemplate = (templateName) => {
  const templatePath = path.join(__dirname, '..', 'templates', `${templateName}.hbs`);
  const templateSource = fs.readFileSync(templatePath, 'utf8');
  return handlebars.compile(templateSource);
};

// Read and compile layout template
const layoutTemplate = (() => {
  const layoutPath = path.join(__dirname, '..', 'templates', 'layout.hbs');
  const layoutSource = fs.readFileSync(layoutPath, 'utf8');
  return handlebars.compile(layoutSource);
})();

// Get current year for copyright
const getCurrentYear = () => new Date().getFullYear();

/**
 * Send an email using a template
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.template - Template name
 * @param {Object} options.context - Template context data
 */
exports.sendTemplatedEmail = async ({ to, subject, template, context }) => {
  try {
    // Compile the specific template
    const templateCompiled = compileTemplate(template);
    const body = templateCompiled(context);

    // Insert the compiled template into layout
    const layoutContext = {
      title: subject,
      body,
      appName: process.env.APP_NAME || 'Alenalki',
      currentYear: getCurrentYear(),
      ...context
    };

    const html = layoutTemplate(layoutContext);

    // Send email
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'Alenalki News'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

/**
 * Send verification email
 * @param {String} email - Recipient email
 * @param {String} verificationCode - Verification code
 */
exports.sendVerificationEmail = async (email, verificationCode) => {
  await exports.sendTemplatedEmail({
    to: email,
    subject: 'Verify Your Email Address',
    template: 'verification',
    context: {
      verificationCode
    }
  });
};

/**
 * Send password reset email
 * @param {String} email - Recipient email
 * @param {String} resetURL - Password reset URL
 */
exports.sendPasswordResetEmail = async (email, resetURL) => {
  await exports.sendTemplatedEmail({
    to: email,
    subject: 'Password Reset Request',
    template: 'password-reset',
    context: {
      resetURL
    }
  });
};

/**
 * Send welcome email after verification
 * @param {String} email - Recipient email
 */
exports.sendWelcomeEmail = async (email) => {
  await exports.sendTemplatedEmail({
    to: email,
    subject: 'Welcome to Our Platform',
    template: 'welcome',
    context: {
      loginUrl: `${process.env.CLIENT_URL}/login`
    }
  });
};

/**
 * Send contact form submission email to admin
 * @param {Object} contactData - Contact form data
 */
exports.sendContactFormEmail = async (contactData) => {
  const { firstName, lastName, email, phone, message } = contactData;

  await exports.sendTemplatedEmail({
    to: process.env.ADMIN_EMAIL || 'codezone67@gmail.com',
    subject: 'New Contact Form Submission',
    template: 'contact-form',
    context: {
      firstName,
      lastName,
      email,
      phone,
      message,
      submissionDate: new Date().toLocaleString()
    }
  });
};

/**
 * Send acknowledgement email to user after contact form submission
 * @param {Object} contactData - Contact form data
 */
exports.sendContactAcknowledgementEmail = async (contactData) => {
  const { firstName, lastName, email } = contactData;

  await exports.sendTemplatedEmail({
    to: email,
    subject: 'Thank you for contacting us - Message Received',
    template: 'contact-acknowledgement',
    context: {
      firstName,
      lastName,
      supportEmail: process.env.ADMIN_EMAIL || 'info@alenalki.se'
    }
  });
};

/**
 * Send newsletter confirmation email
 * @param {Object} subscriberData - Subscriber data
 */
exports.sendNewsletterConfirmationEmail = async (subscriberData) => {
  const { email, firstName } = subscriberData;

  await exports.sendTemplatedEmail({
    to: email,
    subject: 'Welcome to Alenalki Newsletter!',
    template: 'newsletter-confirmation',
    context: {
      firstName: firstName || 'Subscriber',
      unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe?email=${encodeURIComponent(email)}`,
      supportEmail: process.env.ADMIN_EMAIL || 'info@alenalki.se'
    }
  });
};

/**
 * Send newsletter to all active subscribers
 * @param {Object} newsletterData - Newsletter content
 */
exports.sendNewsletterToSubscribers = async (newsletterData) => {
  try {
    const { subject, content, previewText } = newsletterData;

    // Get all active subscribers in batches to avoid memory issues
    const batchSize = 100;
    let skip = 0;
    let subscriberBatch;

    do {
      subscriberBatch = await prisma.newsletter.findMany({
        where: { isActive: true },
        select: { email: true, firstName: true },
        skip,
        take: batchSize
      });

      if (subscriberBatch.length > 0) {
        // Send emails in parallel for better performance
        const emailPromises = subscriberBatch.map(subscriber =>
          exports.sendTemplatedEmail({
            to: subscriber.email,
            subject,
            template: 'newsletter',
            context: {
              firstName: subscriber.firstName || 'Subscriber',
              content,
              previewText,
              unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe?email=${encodeURIComponent(subscriber.email)}`
            }
          })
        );

        await Promise.all(emailPromises);
        console.log(`Sent newsletter to ${subscriberBatch.length} subscribers`);
      }

      skip += batchSize;
    } while (subscriberBatch.length === batchSize);

    console.log('Newsletter sent to all active subscribers');
  } catch (error) {
    console.error('Newsletter sending error:', error);
    throw error;
  }
};

/**
 * Send account creation notification email
 * @param {Object} userData - User data including email, name, and role
 */
exports.sendAccountCreationEmail = async (userData) => {
  const { email, name, role } = userData;

  await exports.sendTemplatedEmail({
    to: email,
    subject: 'Your Account Has Been Created',
    template: 'account-created',
    context: {
      name: name || email.split('@')[0],
      email,
      role: role || 'User',
      loginUrl: `${process.env.CLIENT_URL}/login`,
      supportEmail: process.env.ADMIN_EMAIL || 'info@alenalki.se'
    }
  });
};