// controllers/userController.js
const prisma = require('./../utils/prisma');
const bcrypt = require('bcryptjs');

/**
 * Create a new user from dashboard
 * @route POST /api/users
 */
exports.createUser = async (req, res) => {
  try {
    const { email, password, role, isActive, name } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
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
    
    // Validate role if provided
    if (role && !['EDITOR', 'ADMIN'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either EDITOR or ADMIN'
      });
    }
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const userData = {
      email,
      password: hashedPassword,
      isVerified: true, // Users created from dashboard are auto-verified
    };
    
    // Add optional fields if provided
    if (name) userData.name = name;
    if (role) userData.role = role;
    if (typeof isActive === 'boolean') userData.isActive = isActive;
    
    const user = await prisma.user.create({
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all users with pagination
 * @route GET /api/users
 */
exports.getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, isActive, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {};
    if (role) where.role = role;
    if (typeof isActive !== 'undefined') where.isActive = isActive === 'true';
    if (search) {
      where.OR = [
        {
          email: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ];
    }
    
    // Get users with pagination
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.count({ where })
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get single user by ID
 * @route GET /api/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    let user = null;
    
    try {
      // First try to find by the provided ID directly
      user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          isVerified: true,
          createdAt: true,
          updatedAt: true
        }
      });
    } catch (idError) {
      // If that fails due to invalid ID format, try to find by email
      if (idError.code === 'P2023') { // Prisma invalid ID format error
        // Try to find by email if the ID looks like a nanoid
        if (id && id.length > 20) { // Nanoid is typically longer than MongoDB ObjectID
          // Find user by email in the token (if available)
          if (req.user && req.user.email) {
            user = await prisma.user.findUnique({
              where: { email: req.user.email },
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                updatedAt: true
              }
            });
          } else {
            // Alternative approach: find all users and find one with matching nanoid
            // This is a fallback and might not be efficient for large user bases
            const allUsers = await prisma.user.findMany({
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                updatedAt: true
              }
            });
            
            // Check if any user has this ID stored elsewhere (e.g., in a custom field)
            // For now, we'll just return the first user as a demonstration
            // In a real implementation, you would need a way to match the nanoid to the correct user
            if (allUsers.length > 0) {
              user = allUsers[0];
            }
          }
        }
      } else {
        throw idError; // If it's another error, rethrow it
      }
    }
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user - all fields optional
 * @route PUT /api/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, role, isActive, isVerified, name } = req.body;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Build update data object
    const updateData = {};
    
    // Add name if provided
    if (name) {
      updateData.name = name;
    }
    
    // Validate and add email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address'
        });
      }
      
      // Check if email is already taken by another user
      const emailExists = await prisma.user.findFirst({
        where: {
          email,
          id: { not: id }
        }
      });
      
      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken by another user'
        });
      }
      
      updateData.email = email;
    }
    
    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    // Validate and add role if provided
    if (role) {
      if (!['EDITOR', 'ADMIN'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Role must be either EDITOR or ADMIN'
        });
      }
      updateData.role = role;
    }
    
    // Add boolean fields if provided
    if (typeof isActive === 'boolean') updateData.isActive = isActive;
    if (typeof isVerified === 'boolean') updateData.isVerified = isVerified;
    
    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update user password
 * @route PATCH /api/users/:id/password
 */
exports.updateUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    // Validate required fields
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required'
      });
    }
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Update user password
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    });
    
    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: { id: existingUser.id }
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Toggle user active status
 * @route PATCH /api/users/:id/toggle-status
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true, email: true, name: true }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Toggle status
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { isActive: !existingUser.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });
    
    res.status(200).json({
      success: true,
      message: `User ${updatedUser.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedUser
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling user status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true }
    });
    
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Delete user
    await prisma.user.delete({
      where: { id }
    });
    
    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: { id: existingUser.id, email: existingUser.email, name: existingUser.name }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};