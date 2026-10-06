const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/auth');

// All /api/admin routes require valid JWT admin authentication
router.use(authMiddleware);

// Users management
router.get('/users', adminController.getAllUsers);
router.patch('/users/:id/suspend', adminController.suspendUser);
router.patch('/users/:id/reactivate', adminController.reactivateUser);

// Incident fake marking
router.patch('/incidents/:id/fake', adminController.markIncidentFake);

module.exports = router;
