const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/login — Admin login (protected by brute-force rate limiter)
router.post('/login', loginLimiter, authController.login);

module.exports = router;
