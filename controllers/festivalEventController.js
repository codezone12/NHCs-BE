const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a new festival event
 * @route POST /api/v1/festival-events
 */
exports.createFestivalEvent = async (req, res) => {
  try {
    const { title, description, date, location, isOnline, isActive, imageUrl } = req.body;

    // Validate required fields
    if (!title || !description || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, and date'
      });
    }

    const festivalEvent = await prisma.festivalEvent.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        isOnline: isOnline || false,
        isActive: isActive !== undefined ? isActive : true,
        imageUrl
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Festival event created successfully',
      data: festivalEvent
    });
  } catch (error) {
    console.error('Error creating festival event:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create festival event',
      error: error.message
    });
  }
};

/**
 * Get all festival events with filtering and pagination
 * @route GET /api/v1/festival-events
 */
exports.getFestivalEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      active,
      upcoming,
      past,
      dateFrom,
      dateTo
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter conditions
    const where = {};

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { location: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Active status filter
    if (active !== undefined) {
      where.isActive = active === 'true';
    }

    // Date filters
    const now = new Date();
    
    if (upcoming === 'true') {
      where.date = { gte: now };
    }
    
    if (past === 'true') {
      where.date = { lt: now };
    }
    
    if (dateFrom) {
      where.date = { ...where.date, gte: new Date(dateFrom) };
    }
    
    if (dateTo) {
      where.date = { ...where.date, lte: new Date(dateTo) };
    }

    // Count total events matching the filter
    const totalEvents = await prisma.festivalEvent.count({ where });
    const totalPages = Math.ceil(totalEvents / limitNum);

    // Get events with pagination
    const festivalEvents = await prisma.festivalEvent.findMany({
      where,
      orderBy: { date: 'asc' },
      skip,
      take: limitNum
    });

    return res.status(200).json({
      success: true,
      message: 'Festival events retrieved successfully',
      data: {
        festivalEvents,
        pagination: {
          total: totalEvents,
          pages: totalPages,
          page: pageNum,
          limit: limitNum
        }
      }
    });
  } catch (error) {
    console.error('Error getting festival events:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get festival events',
      error: error.message
    });
  }
};

/**
 * Get public festival events (active and upcoming only)
 * @route GET /api/v1/festival-events/public
 */
exports.getPublicFestivalEvents = async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    const limitNum = parseInt(limit);

    const now = new Date();
    
    // Get only active and upcoming events
    const festivalEvents = await prisma.festivalEvent.findMany({
      where: {
        isActive: true,
        date: { gte: now }
      },
      orderBy: { date: 'asc' },
      take: limitNum
    });

    return res.status(200).json({
      success: true,
      message: 'Public festival events retrieved successfully',
      data: festivalEvents
    });
  } catch (error) {
    console.error('Error getting public festival events:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get public festival events',
      error: error.message
    });
  }
};

/**
 * Get festival event by ID
 * @route GET /api/v1/festival-events/:id
 */
exports.getFestivalEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const festivalEvent = await prisma.festivalEvent.findUnique({
      where: { id }
    });

    if (!festivalEvent) {
      return res.status(404).json({
        success: false,
        message: 'Festival event not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Festival event retrieved successfully',
      data: festivalEvent
    });
  } catch (error) {
    console.error('Error getting festival event:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get festival event',
      error: error.message
    });
  }
};

/**
 * Update festival event
 * @route PUT /api/v1/festival-events/:id
 */
exports.updateFestivalEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, isOnline, isActive, imageUrl } = req.body;

    // Check if event exists
    const existingEvent = await prisma.festivalEvent.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Festival event not found'
      });
    }

    // Update event
    const updatedEvent = await prisma.festivalEvent.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(date && { date: new Date(date) }),
        ...(location !== undefined && { location }),
        ...(isOnline !== undefined && { isOnline }),
        ...(isActive !== undefined && { isActive }),
        ...(imageUrl !== undefined && { imageUrl })
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Festival event updated successfully',
      data: updatedEvent
    });
  } catch (error) {
    console.error('Error updating festival event:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update festival event',
      error: error.message
    });
  }
};

/**
 * Toggle festival event active status
 * @route PATCH /api/v1/festival-events/:id/toggle-status
 */
exports.toggleFestivalEventStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const existingEvent = await prisma.festivalEvent.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Festival event not found'
      });
    }

    // Toggle status
    const updatedEvent = await prisma.festivalEvent.update({
      where: { id },
      data: {
        isActive: !existingEvent.isActive
      }
    });

    return res.status(200).json({
      success: true,
      message: `Festival event ${updatedEvent.isActive ? 'activated' : 'deactivated'} successfully`,
      data: updatedEvent
    });
  } catch (error) {
    console.error('Error toggling festival event status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to toggle festival event status',
      error: error.message
    });
  }
};

/**
 * Delete festival event
 * @route DELETE /api/v1/festival-events/:id
 */
exports.deleteFestivalEvent = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if event exists
    const existingEvent = await prisma.festivalEvent.findUnique({
      where: { id }
    });

    if (!existingEvent) {
      return res.status(404).json({
        success: false,
        message: 'Festival event not found'
      });
    }

    // Delete event
    await prisma.festivalEvent.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'Festival event deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting festival event:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete festival event',
      error: error.message
    });
  }
};
