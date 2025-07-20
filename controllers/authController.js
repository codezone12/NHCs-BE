// controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('./../utils/prisma');
const { 
  sendVerificationEmail, 
  sendPasswordResetEmail, 
  sendWelcomeEmail 
} = require('../utils/email');
/**
 * Register a new user
 * @route POST /api/auth/signup
 */
exports.signup = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists and is verified
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // If user exists but not verified, delete the existing record
    if (existingUser && !existingUser.isVerified) {
      await prisma.user.delete({
        where: { id: existingUser.id }
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate 6-digit verification token
    const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create a new user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpires,
        isVerified: false
      }
    });

    await sendVerificationEmail(user.email, verificationToken);

    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email for verification code.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User does not exists'
      });
    }

    // Check if password is correct
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (user.isActive === false) {
      return res.status(401).json({
        success: false,
        message: 'Your account is not active please contact admin'
      });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in'
      });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Set cookie with the token
    const cookieOptions = {
      expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    };

    res.cookie('jwt', token, cookieOptions);

    // Remove password from output
    const { password: _, ...userWithoutPassword } = user;

    // Store user data in localStorage for frontend access
    const userData = {
      id: user.id, // MongoDB ObjectID
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.status(200).json({
      success: true,
      token,
      data: {
        user: userData
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Forgot password
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Store token in user document with expiry (10 minutes)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: new Date(Date.now() + 10 * 60 * 1000)
      }
    });

    // Create reset URL
    const resetURL = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    // Send reset URL via email
    await sendPasswordResetEmail(user.email, resetURL);

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;
    // Get token from request body or query parameters instead of route params
    const token = req.body.token || req.query.token;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Reset token is required'
      });
    }

    // Hash the reset token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user by token
    const user = await prisma.user.findFirst({
      where: {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token is invalid or has expired'
      });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    // Create new JWT
    const jwtToken = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful'
    });
  } catch(error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing request',
      error: process.env.NODE_ENV === 'development'? error.message : undefined
    });
  }
};

/**
 * Verify otp
 * @route POST /api/auth/verify-otp
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, token } = req.body;

    // Find user by verification token
    const user = await prisma.user.findFirst({
      where: {
        email,
        verificationToken: token,
        verificationTokenExpires: {
          gt: new Date()
        }
      }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        verificationToken: null,
        verificationTokenExpires: null
      }
    });

    // Send welcome email
    await sendWelcomeEmail(user.email);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Logout user
 * @route GET /api/auth/logout
 */
exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};