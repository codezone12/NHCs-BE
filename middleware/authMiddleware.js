const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

/**
 * Middleware to protect routes and verify user authentication
 */
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // 1) Check if token exists in cookies or headers
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    console.log(token)

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'You are not logged in. Please log in to get access.'
      });
    }

    // 2) Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log(decoded)

    // 3) Check if user still exists
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // 4) Check if user is active
    if (!currentUser.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Your account is not active. Please contact admin.'
      });
    }

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token or authentication failed.'
    });
  }
};

/**
 * Middleware to restrict access based on user roles
 * @param {...String} roles - Roles allowed to access the route
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.'
      });
    }
    next();
  };
};

/**
 * Middleware to check if user is authenticated but allow public access
 * This will attach user data to req if authenticated but won't block if not
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(); // Continue without authentication
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists
    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id }
    });

    if (currentUser && currentUser.isActive) {
      req.user = currentUser;
    }
    
    next();
  } catch (error) {
    // Just continue without authentication if token is invalid
    next();
  }
};
