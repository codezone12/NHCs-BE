// routes/transportationRoutes.js
const express = require('express');
const router = express.Router();
const transportationController = require('../controllers/transportationController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Public routes
router.get('/public', transportationController.getPublicTransportations);

// Protected routes (admin only)
router.get('/', protect, restrictTo('admin', 'super-admin'), transportationController.getAllTransportations);
router.post('/', protect, restrictTo('admin', 'super-admin'), transportationController.createTransportation);
router.get('/:id', protect, restrictTo('admin', 'super-admin'), transportationController.getTransportationById);
router.put('/:id', protect, restrictTo('admin', 'super-admin'), transportationController.updateTransportation);
router.delete('/:id', protect, restrictTo('admin', 'super-admin'), transportationController.deleteTransportation);
router.patch('/:id/toggle-status', protect, restrictTo('admin', 'super-admin'), transportationController.toggleTransportationStatus);

module.exports = router;
