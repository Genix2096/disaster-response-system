const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const authMiddleware = require('../middleware/auth');
const { authenticateUser, loadUserProfile, requireActiveAccount } = require('../middleware/cognitoAuth');
const upload = require('../middleware/upload');

// Authenticated Cognito user: Submit a new incident (multipart form with optional image).
// Auth runs BEFORE multer so unauthenticated uploads are rejected early.
router.post(
  '/',
  authenticateUser,
  loadUserProfile,
  requireActiveAccount,
  upload.single('image'),
  incidentController.createIncident
);

// Admin-only routes (protected by JWT)
router.get('/', authMiddleware, incidentController.getAllIncidents);
router.get('/:id', authMiddleware, incidentController.getIncidentById);
router.patch('/:id/status', authMiddleware, incidentController.updateStatus);
router.delete('/:id', authMiddleware, incidentController.deleteIncident);

module.exports = router;
