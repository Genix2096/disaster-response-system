const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateUser, loadUserProfile } = require('../middleware/cognitoAuth');

// Every /api/users route requires a verified Cognito user.
// loadUserProfile provisions the DisasterUsers profile on first access.
router.use(authenticateUser, loadUserProfile);

router.get('/me', userController.getMe);
router.get('/me/incidents', userController.getMyIncidents);
router.get('/me/incidents/:id', userController.getMyIncidentById);

module.exports = router;
