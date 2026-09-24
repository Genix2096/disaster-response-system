const express = require('express');
const router = express.Router();
const incidentController = require('../controllers/incidentController');
const authMiddleware = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public: Submit a new incident (multipart form with optional image)
router.post('/', upload.single('image'), incidentController.createIncident);

// Admin-only routes (protected by JWT)
router.get('/', authMiddleware, incidentController.getAllIncidents);
router.get('/:id', authMiddleware, incidentController.getIncidentById);
router.patch('/:id/status', authMiddleware, incidentController.updateStatus);
router.delete('/:id', authMiddleware, incidentController.deleteIncident);

module.exports = router;
