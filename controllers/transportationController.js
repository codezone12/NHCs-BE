// controllers/transportationController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all transportation options with filtering and pagination
exports.getAllTransportations = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      active,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Parse query parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;

    // Build filter object
    const filter = {
      where: {
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { type: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(isActive !== undefined && { isActive })
      },
      orderBy: {
        [sortBy]: sortOrder.toLowerCase()
      }
    };

    // Count total records with filter
    const totalCount = await prisma.transportation.count(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    // Get records with pagination
    const transportations = await prisma.transportation.findMany({
      ...filter,
      skip,
      take: limitNum
    });

    return res.status(200).json({
      success: true,
      data: {
        transportations,
        pagination: {
          total: totalCount,
          pages: totalPages,
          page: pageNum,
          limit: limitNum
        }
      },
      message: 'Transportation options retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching transportation options:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching transportation options',
      error: error.message
    });
  }
};

// Get public transportation options (active only)
exports.getPublicTransportations = async (req, res) => {
  try {
    const transportations = await prisma.transportation.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        order: 'asc'
      }
    });

    return res.status(200).json({
      success: true,
      data: transportations,
      message: 'Public transportation options retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching public transportation options:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching public transportation options',
      error: error.message
    });
  }
};

// Get transportation option by ID
exports.getTransportationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transportation = await prisma.transportation.findUnique({
      where: { id }
    });

    if (!transportation) {
      return res.status(404).json({
        success: false,
        message: 'Transportation option not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: transportation,
      message: 'Transportation option retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching transportation option:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching transportation option',
      error: error.message
    });
  }
};

// Create new transportation option
exports.createTransportation = async (req, res) => {
  try {
    const {
      type,
      title,
      icon,
      bgColor,
      textColor,
      details,
      tip,
      tipColor,
      order = 0,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!title || !type || !icon) {
      return res.status(400).json({
        success: false,
        message: 'Title, type, and icon are required fields'
      });
    }

    const transportation = await prisma.transportation.create({
      data: {
        type,
        title,
        icon,
        bgColor,
        textColor,
        details,
        tip,
        tipColor,
        order: parseInt(order),
        isActive
      }
    });

    return res.status(201).json({
      success: true,
      data: transportation,
      message: 'Transportation option created successfully'
    });
  } catch (error) {
    console.error('Error creating transportation option:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating transportation option',
      error: error.message
    });
  }
};

// Update transportation option
exports.updateTransportation = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      title,
      icon,
      bgColor,
      textColor,
      details,
      tip,
      tipColor,
      order,
      isActive
    } = req.body;

    // Check if transportation exists
    const existingTransportation = await prisma.transportation.findUnique({
      where: { id }
    });

    if (!existingTransportation) {
      return res.status(404).json({
        success: false,
        message: 'Transportation option not found'
      });
    }

    // Update transportation
    const updatedTransportation = await prisma.transportation.update({
      where: { id },
      data: {
        ...(type !== undefined && { type }),
        ...(title !== undefined && { title }),
        ...(icon !== undefined && { icon }),
        ...(bgColor !== undefined && { bgColor }),
        ...(textColor !== undefined && { textColor }),
        ...(details !== undefined && { details }),
        ...(tip !== undefined && { tip }),
        ...(tipColor !== undefined && { tipColor }),
        ...(order !== undefined && { order }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return res.status(200).json({
      success: true,
      data: updatedTransportation,
      message: 'Transportation option updated successfully'
    });
  } catch (error) {
    console.error('Error updating transportation option:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating transportation option',
      error: error.message
    });
  }
};

// Delete transportation option
exports.deleteTransportation = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transportation exists
    const existingTransportation = await prisma.transportation.findUnique({
      where: { id }
    });

    if (!existingTransportation) {
      return res.status(404).json({
        success: false,
        message: 'Transportation option not found'
      });
    }

    // Delete transportation
    await prisma.transportation.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Transportation option deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transportation option:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting transportation option',
      error: error.message
    });
  }
};

// Toggle transportation status
exports.toggleTransportationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if transportation exists
    const existingTransportation = await prisma.transportation.findUnique({
      where: { id }
    });

    if (!existingTransportation) {
      return res.status(404).json({
        success: false,
        message: 'Transportation option not found'
      });
    }

    // Toggle status
    const updatedTransportation = await prisma.transportation.update({
      where: { id },
      data: {
        isActive: !existingTransportation.isActive
      }
    });

    return res.status(200).json({
      success: true,
      data: updatedTransportation,
      message: 'Transportation status toggled successfully'
    });
  } catch (error) {
    console.error('Error toggling transportation status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error toggling transportation status',
      error: error.message
    });
  }
};
