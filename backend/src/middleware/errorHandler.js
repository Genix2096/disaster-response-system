const logger = require('../utils/logger');

/**
 * Centralized error handling middleware.
 * Catches all errors and returns clean JSON responses.
 * Never exposes internal details or credentials to clients.
 */
function errorHandler(err, req, res, next) {
  logger.error('Unhandled error', { error: err, path: req.path, method: req.method });

  // Multer file size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5 MB.',
    });
  }

  // Multer file type error
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token.',
    });
  }

  // Default server error — never expose stack traces
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error.' : err.message,
  });
}

module.exports = errorHandler;
