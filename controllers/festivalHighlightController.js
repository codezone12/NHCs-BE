// controllers/festivalHighlightController.js
const prisma = require('./../utils/prisma');

/**
 * Create a new festival highlight
 * @route POST /api/festival-highlights
 */
exports.createFestivalHighlight = async (req, res) => {
  try {
    const { title, content, icon, bgColor, hoverBg, borderColor, textColor, order, isActive } = req.body;

    // Validate required fields
    if (!title || !content || !icon) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, content and icon'
      });
    }

    // Create festival highlight
    const highlight = await prisma.festivalHighlight.create({
      data: {
        title,
        content,
        icon,
        bgColor: bgColor || 'bg-blue-500',
        hoverBg: hoverBg || 'hover:bg-blue-600',
        borderColor: borderColor || 'border-blue-500',
        textColor: textColor || 'text-blue-600',
        order: parseInt(order) || 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true
      }
    });

    res.status(201).json({
      success: true,
      data: highlight
    });
  } catch (error) {
    console.error('Create festival highlight error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating festival highlight',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all festival highlights with optional filtering
 * @route GET /api/festival-highlights
 */
exports.getFestivalHighlights = async (req, res) => {
  try {
    const { isActive, search, sort, page = 1, limit = 10 } = req.query;
    
    // Build filter object
    const filter = {};
    
    // Add isActive filter if provided
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }
    
    // Add search filter if provided
    if (search) {
      filter.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build sort object
    let orderBy = { order: 'asc' }; // Default sort by order
    if (sort) {
      const [field, direction] = sort.split(':');
      orderBy = { [field]: direction || 'asc' };
    }
    
    // Get total count for pagination
    const total = await prisma.festivalHighlight.count({ where: filter });
    
    // Get festival highlights
    const highlights = await prisma.festivalHighlight.findMany({
      where: filter,
      orderBy,
      skip,
      take: parseInt(limit)
    });
    
    res.status(200).json({
      success: true,
      data: {
        highlights,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get festival highlights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching festival highlights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get festival highlight by ID
 * @route GET /api/festival-highlights/:id
 */
exports.getFestivalHighlightById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const highlight = await prisma.festivalHighlight.findUnique({
      where: { id }
    });
    
    if (!highlight) {
      return res.status(404).json({
        success: false,
        message: 'Festival highlight not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: highlight
    });
  } catch (error) {
    console.error('Get festival highlight by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching festival highlight',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update festival highlight
 * @route PUT /api/festival-highlights/:id
 */
exports.updateFestivalHighlight = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, icon, bgColor, hoverBg, borderColor, textColor, order, isActive } = req.body;
    
    // Check if highlight exists
    const existingHighlight = await prisma.festivalHighlight.findUnique({
      where: { id }
    });
    
    if (!existingHighlight) {
      return res.status(404).json({
        success: false,
        message: 'Festival highlight not found'
      });
    }
    
    // Update highlight
    const updatedHighlight = await prisma.festivalHighlight.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(icon !== undefined && { icon }),
        ...(bgColor !== undefined && { bgColor }),
        ...(hoverBg !== undefined && { hoverBg }),
        ...(borderColor !== undefined && { borderColor }),
        ...(textColor !== undefined && { textColor }),
        ...(order !== undefined && { order: parseInt(order) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) })
      }
    });
    
    res.status(200).json({
      success: true,
      data: updatedHighlight
    });
  } catch (error) {
    console.error('Update festival highlight error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating festival highlight',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Toggle festival highlight active status
 * @route PATCH /api/festival-highlights/:id/toggle-status
 */
exports.toggleFestivalHighlightStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if highlight exists
    const existingHighlight = await prisma.festivalHighlight.findUnique({
      where: { id }
    });
    
    if (!existingHighlight) {
      return res.status(404).json({
        success: false,
        message: 'Festival highlight not found'
      });
    }
    
    // Toggle status
    const updatedHighlight = await prisma.festivalHighlight.update({
      where: { id },
      data: {
        isActive: !existingHighlight.isActive
      }
    });
    
    res.status(200).json({
      success: true,
      data: updatedHighlight
    });
  } catch (error) {
    console.error('Toggle festival highlight status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error toggling festival highlight status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete festival highlight
 * @route DELETE /api/festival-highlights/:id
 */
exports.deleteFestivalHighlight = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if highlight exists
    const existingHighlight = await prisma.festivalHighlight.findUnique({
      where: { id }
    });
    
    if (!existingHighlight) {
      return res.status(404).json({
        success: false,
        message: 'Festival highlight not found'
      });
    }
    
    // Delete highlight
    await prisma.festivalHighlight.delete({
      where: { id }
    });
    
    res.status(200).json({
      success: true,
      message: 'Festival highlight deleted successfully'
    });
  } catch (error) {
    console.error('Delete festival highlight error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting festival highlight',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get public festival highlights (active only, sorted by order)
 * @route GET /api/festival-highlights/public
 */
exports.getPublicFestivalHighlights = async (req, res) => {
  try {
    const highlights = await prisma.festivalHighlight.findMany({
      where: { isActive: true },
      orderBy: { order: 'asc' }
    });
    
    res.status(200).json({
      success: true,
      data: highlights
    });
  } catch (error) {
    console.error('Get public festival highlights error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching festival highlights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
