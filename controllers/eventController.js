// controllers/eventController.js
const prisma = require('./../utils/prisma');

/**
 * Create a new event
 * @route POST /api/events
 */
exports.createEvent = async (req, res) => {
  try {
    const { title, description, date, location, isOnline, isActive, imageUrl } = req.body;

    // Validate required fields
    if (!title || !description || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description and date'
      });
    }

    // Create event
    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        isOnline: Boolean(isOnline),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        imageUrl
      }
    });

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all events with optional filtering
 * @route GET /api/events
 */
exports.getEvents = async (req, res) => {
  try {
    const { active, upcoming, past, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {};
    
    // Filter by active status if specified
    if (active !== undefined) {
      where.isActive = active === 'true';
    }
    
    // Filter by date for upcoming or past events
    const now = new Date();
    if (upcoming === 'true') {
      where.date = { gte: now };
    } else if (past === 'true') {
      where.date = { lt: now };
    }
    
    // Get events with pagination
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { date: 'asc' }
      }),
      prisma.event.count({ where })
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        events,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get event by ID
 * @route GET /api/events/:id
 */
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await prisma.event.findUnique({
      where: { id }
    });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update event
 * @route PUT /api/events/:id
 */
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, location, isOnline, isActive, imageUrl } = req.body;
    
    // Check if event exists
    const eventExists = await prisma.event.findUnique({
      where: { id }
    });
    
    if (!eventExists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Update event
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(date !== undefined && { date: new Date(date) }),
        ...(location !== undefined && { location }),
        ...(isOnline !== undefined && { isOnline: Boolean(isOnline) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(imageUrl !== undefined && { imageUrl })
      }
    });
    
    res.status(200).json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Toggle event active status
 * @route PATCH /api/events/:id/toggle-status
 */
exports.toggleEventStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id }
    });
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Toggle status
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        isActive: !event.isActive
      }
    });
    
    res.status(200).json({
      success: true,
      data: updatedEvent
    });
  } catch (error) {
    console.error('Toggle event status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling event status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete event
 * @route DELETE /api/events/:id
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if event exists
    const eventExists = await prisma.event.findUnique({
      where: { id }
    });
    
    if (!eventExists) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }
    
    // Delete event
    await prisma.event.delete({
      where: { id }
    });
    
    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting event',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
