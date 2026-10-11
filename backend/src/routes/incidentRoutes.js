const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const authMiddleware = require('../middleware/auth');
const { authenticateUser, loadUserProfile, requireActiveAccount } = require('../middleware/cognitoAuth');
const upload = require('../middleware/upload');
const { incidentCreationLimiter } = require('../middleware/rateLimiter');

// Authenticated Cognito user: Submit a new incident (multipart form with optional image).
// Auth runs BEFORE multer so unauthenticated uploads are rejected early.
// incidentCreationLimiter enforces the 10 reports / 15 min limit per authenticated user before reading the file buffer.
// upload.validateImageFile verifies binary magic bytes and rejects spoofed/mismatched/markup files.
router.post(
  '/',
  authenticateUser,
  loadUserProfile,
  requireActiveAccount,
  incidentCreationLimiter,
  upload.single('image'),
  upload.validateImageFile,
  incidentController.createIncident
);

// Admin-only routes (protected by JWT)
router.get('/', authMiddleware, incidentController.getAllIncidents);
router.get('/:id', authMiddleware, incidentController.getIncidentById);
router.patch('/:id/status', authMiddleware, incidentController.updateStatus);
router.delete('/:id', authMiddleware, incidentController.deleteIncident);

module.exports = router;
