const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const contactController = require('../controllers/contactController');
const newsletterController = require('../controllers/newsletterController');
const userController = require('../controllers/userController');
const eventController = require('../controllers/eventController');
const festivalHighlightController = require('../controllers/festivalHighlightController');
const festivalEventController = require('../controllers/festivalEventController');
const transportationController = require('../controllers/transportationController');
const newsController = require('../controllers/newsController');
const blogController = require('../controllers/blogController');
const multer = require('multer');

// Configure multer for memory storage (for Cloudinary uploads)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Auth routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOtp);
router.post('/reset-password', authController.resetPassword); // Changed from '/reset-password/:token'
router.get('/logout', authController.logout);

// Contact routes
router.post('/contact', contactController.submitContactForm);

// User management routes (typically protected and admin-only)
router.post('/user/', userController.createUser);                    // Create user
router.get('/user/', userController.getUsers);                       // Get all users with pagination
router.get('/user/:id', userController.getUserById);                 // Get user by ID
router.put('/user/:id', userController.updateUser);                  // Update user (all fields optional)
router.patch('/user/:id/password', userController.updateUserPassword); // Update user password
router.patch('/user/:id/toggle-status', userController.toggleUserStatus); // Toggle active status
router.delete('/user/:id', userController.deleteUser);               // Delete user

// Newsletter routes
router.post('/newsletter/subscribe', newsletterController.subscribeToNewsletter);
router.post('/newsletter/unsubscribe', newsletterController.unsubscribeFromNewsletter);
router.get('/newsletter/stats', newsletterController.getNewsletterStats);

// Event management routes
router.post('/events', eventController.createEvent);                 // Create event
router.get('/events', eventController.getEvents);                    // Get all events with pagination
router.get('/events/:id', eventController.getEventById);             // Get event by ID
router.put('/events/:id', eventController.updateEvent);              // Update event (all fields optional)
router.patch('/events/:id/toggle-status', eventController.toggleEventStatus); // Toggle active status
router.delete('/events/:id', eventController.deleteEvent);           // Delete event

// Festival Events routes
router.post('/festival-events', festivalEventController.createFestivalEvent);                 // Create festival event
router.get('/festival-events', festivalEventController.getFestivalEvents);                    // Get all festival events with pagination
router.get('/festival-events/public', festivalEventController.getPublicFestivalEvents);       // Get public festival events (active only)
router.get('/festival-events/:id', festivalEventController.getFestivalEventById);             // Get festival event by ID
router.put('/festival-events/:id', festivalEventController.updateFestivalEvent);              // Update festival event
router.patch('/festival-events/:id/toggle-status', festivalEventController.toggleFestivalEventStatus); // Toggle active status
router.delete('/festival-events/:id', festivalEventController.deleteFestivalEvent);           // Delete festival event

// Festival Highlights routes
router.post('/festival-highlights', festivalHighlightController.createFestivalHighlight);                 // Create highlight
router.get('/festival-highlights', festivalHighlightController.getFestivalHighlights);                    // Get all highlights with pagination
router.get('/festival-highlights/public', festivalHighlightController.getPublicFestivalHighlights);       // Get public highlights (active only)
router.get('/festival-highlights/:id', festivalHighlightController.getFestivalHighlightById);             // Get highlight by ID
router.put('/festival-highlights/:id', festivalHighlightController.updateFestivalHighlight);              // Update highlight
router.patch('/festival-highlights/:id/toggle-status', festivalHighlightController.toggleFestivalHighlightStatus); // Toggle active status
router.delete('/festival-highlights/:id', festivalHighlightController.deleteFestivalHighlight);           // Delete highlight

// Transportation routes
router.post('/transportations', transportationController.createTransportation);                 // Create transportation option
router.get('/transportations', transportationController.getAllTransportations);                 // Get all transportation options with pagination
router.get('/transportations/public', transportationController.getPublicTransportations);       // Get public transportation options (active only)
router.get('/transportations/:id', transportationController.getTransportationById);             // Get transportation option by ID
router.put('/transportations/:id', transportationController.updateTransportation);              // Update transportation option
router.patch('/transportations/:id/toggle-status', transportationController.toggleTransportationStatus); // Toggle active status
router.delete('/transportations/:id', transportationController.deleteTransportation);           // Delete transportation option

// News routes
router.post('/news', upload.single('imageFile'), newsController.createNews);                 // Create news with optional image upload
router.get('/news', newsController.getAllNews);                  // Get all news with pagination
router.get('/news/public', newsController.getPublicNews);        // Get public news (active only)
router.get('/news/trending', newsController.getTrendingNews);    // Get trending news
router.get('/news/:id', newsController.getNewsById);             // Get news by ID
router.put('/news/:id', upload.single('imageFile'), newsController.updateNews);              // Update news with optional image upload
router.patch('/news/:id/toggle-status', newsController.toggleNewsStatus); // Toggle active status
router.patch('/news/:id/toggle-trending', newsController.toggleTrendingStatus); // Toggle trending status
router.delete('/news/:id', newsController.deleteNews);           // Delete news

// Blog routes
router.post('/blogs', upload.single('pdfFile'), blogController.createBlog);                 // Create blog with optional PDF upload
router.get('/blogs', blogController.getAllBlogs);                  // Get all blogs with pagination
router.get('/blogs/public', blogController.getPublicBlogs);        // Get public blogs (active only)
router.get('/blogs/featured', blogController.getFeaturedBlogs);    // Get featured blogs
router.get('/blogs/:id', blogController.getBlogById);             // Get blog by ID
router.put('/blogs/:id', upload.single('pdfFile'), blogController.updateBlog);              // Update blog with optional PDF upload
router.patch('/blogs/:id/toggle-status', blogController.toggleBlogStatus); // Toggle active status
router.patch('/blogs/:id/toggle-featured', blogController.toggleFeaturedStatus); // Toggle featured status
router.delete('/blogs/:id', blogController.deleteBlog);           // Delete blog

module.exports = router;
