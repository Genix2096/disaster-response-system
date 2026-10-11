const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * JWT authentication middleware.
 * Protects admin-only routes.
 */
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.',
    });
  }

  const token = authHeader.split(' ')[1];

  const secret = typeof config.jwtSecret === 'string' ? config.jwtSecret.trim() : '';
  if (!secret) {
    logger.error('Admin JWT verification rejected: JWT_SECRET is not configured or empty');
    return res.status(500).json({
      success: false,
      message: 'Authentication service unavailable.',
    });
  }

  try {
    // Pin the algorithm so tokens from other issuers (e.g. Cognito RS256 user
    // tokens) can never be accepted here, and require the admin role.
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (decoded.role !== 'admin') {
      logger.warn('Non-admin token used on admin route');
      return res.status(403).json({
        success: false,
        message: 'Admin access required.',
      });
    }
    req.admin = decoded;
    next();
  } catch (error) {
    logger.warn('Invalid JWT token attempt');
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }
}

module.exports = authMiddleware;
