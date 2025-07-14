// controllers/newsController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all news with filtering and pagination
exports.getAllNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      active,
      category,
      trending,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Parse query parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    const isTrending = trending === 'true' ? true : trending === 'false' ? false : undefined;

    // Build filter object
    const filter = {
      where: {
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } }
          ]
        }),
        ...(isActive !== undefined && { isActive }),
        ...(isTrending !== undefined && { isTrending }),
        ...(category && { category: { contains: category, mode: 'insensitive' } })
      },
      orderBy: {
        [sortBy]: sortOrder.toLowerCase()
      }
    };

    // Count total records with filter
    const totalCount = await prisma.news.count(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    // Get records with pagination
    const news = await prisma.news.findMany({
      ...filter,
      skip,
      take: limitNum
    });

    return res.status(200).json({
      success: true,
      data: {
        news,
        pagination: {
          total: totalCount,
          pages: totalPages,
          page: pageNum,
          limit: limitNum
        }
      },
      message: 'News retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching news',
      error: error.message
    });
  }
};

// Get public news (active only)
exports.getPublicNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      trending
    } = req.query;

    // Parse query parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;
    const isTrending = trending === 'true' ? true : undefined;

    // Build filter object
    const filter = {
      where: {
        isActive: true,
        ...(isTrending !== undefined && { isTrending }),
        ...(category && { category: { contains: category, mode: 'insensitive' } })
      },
      orderBy: {
        createdAt: 'desc'
      }
    };

    // Count total records with filter
    const totalCount = await prisma.news.count(filter);
    const totalPages = Math.ceil(totalCount / limitNum);

    // Get records with pagination
    const news = await prisma.news.findMany({
      ...filter,
      skip,
      take: limitNum
    });

    return res.status(200).json({
      success: true,
      data: {
        news,
        pagination: {
          total: totalCount,
          pages: totalPages,
          page: pageNum,
          limit: limitNum
        }
      },
      message: 'Public news retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching public news:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching public news',
      error: error.message
    });
  }
};

// Get trending news (active and trending only)
exports.getTrendingNews = async (req, res) => {
  try {
    const news = await prisma.news.findMany({
      where: {
        isActive: true,
        isTrending: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      data: news,
      message: 'Trending news retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching trending news:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching trending news',
      error: error.message
    });
  }
};

// Get news by ID
exports.getNewsById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const news = await prisma.news.findUnique({
      where: { id }
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: news,
      message: 'News retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching news:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching news',
      error: error.message
    });
  }
};

// Create new news
exports.createNews = async (req, res) => {
  try {
    const {
      title,
      content,
      category,
      isTrending = false,
      isActive = true
    } = req.body;

    // Validate required fields
    if (!title || !content || !category) {
      return res.status(400).json({
        success: false,
        message: 'Title, content, and category are required fields'
      });
    }

    const news = await prisma.news.create({
      data: {
        title,
        content,
        category,
        isTrending,
        isActive
      }
    });

    return res.status(201).json({
      success: true,
      data: news,
      message: 'News created successfully'
    });
  } catch (error) {
    console.error('Error creating news:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating news',
      error: error.message
    });
  }
};

// Update news
exports.updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      category,
      isTrending,
      isActive
    } = req.body;

    // Check if news exists
    const existingNews = await prisma.news.findUnique({
      where: { id }
    });

    if (!existingNews) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    // Update news
    const updatedNews = await prisma.news.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(isTrending !== undefined && { isTrending }),
        ...(isActive !== undefined && { isActive })
      }
    });

    return res.status(200).json({
      success: true,
      data: updatedNews,
      message: 'News updated successfully'
    });
  } catch (error) {
    console.error('Error updating news:', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating news',
      error: error.message
    });
  }
};

// Delete news
exports.deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if news exists
    const existingNews = await prisma.news.findUnique({
      where: { id }
    });

    if (!existingNews) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    // Delete news
    await prisma.news.delete({
      where: { id }
    });

    return res.status(200).json({
      success: true,
      message: 'News deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting news:', error);
    return res.status(500).json({
      success: false,
      message: 'Error deleting news',
      error: error.message
    });
  }
};

// Toggle news status
exports.toggleNewsStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if news exists
    const existingNews = await prisma.news.findUnique({
      where: { id }
    });

    if (!existingNews) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    // Toggle status
    const updatedNews = await prisma.news.update({
      where: { id },
      data: {
        isActive: !existingNews.isActive
      }
    });

    return res.status(200).json({
      success: true,
      data: updatedNews,
      message: 'News status toggled successfully'
    });
  } catch (error) {
    console.error('Error toggling news status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error toggling news status',
      error: error.message
    });
  }
};

// Toggle trending status
exports.toggleTrendingStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if news exists
    const existingNews = await prisma.news.findUnique({
      where: { id }
    });

    if (!existingNews) {
      return res.status(404).json({
        success: false,
        message: 'News not found'
      });
    }

    // Toggle trending status
    const updatedNews = await prisma.news.update({
      where: { id },
      data: {
        isTrending: !existingNews.isTrending
      }
    });

    return res.status(200).json({
      success: true,
      data: updatedNews,
      message: 'News trending status toggled successfully'
    });
  } catch (error) {
    console.error('Error toggling news trending status:', error);
    return res.status(500).json({
      success: false,
      message: 'Error toggling news trending status',
      error: error.message
    });
  }
};
