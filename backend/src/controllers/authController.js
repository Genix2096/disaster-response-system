const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * POST /api/auth/login — Admin login.
 */
async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required.',
      });
    }

    if (username !== config.adminUsername || password !== config.adminPassword) {
      logger.warn('Failed login attempt', { username });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
      });
    }

    if (!config.jwtSecret) {
      logger.error('JWT_SECRET is not configured');
      return res.status(500).json({
        success: false,
        message: 'Authentication service unavailable.',
      });
    }

    const token = jwt.sign(
      { username: config.adminUsername, role: 'admin' },
      config.jwtSecret,
      { expiresIn: '8h' }
    );

    logger.info('Admin logged in successfully');
    res.json({
      success: true,
      data: { token, username: config.adminUsername },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { login };
