const { rateLimit } = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * ============================================================================
 * RATE LIMITING ARCHITECTURE & OPERATIONAL DOCUMENTATION
 * ============================================================================
 *
 * Storage Mechanism:
 *   By default, express-rate-limit utilizes an internal in-memory MemoryStore.
 *   Each rate limiter maintains an active Map of client hit counters and timestamps.
 *
 * Single-Instance Operation:
 *   - Highly performant, sub-millisecond execution.
 *   - Zero external infrastructure, database, or network dependencies.
 *
 * Horizontal Scaling & Multi-Process Limitations:
 *   - MemoryStore state is local to each Node.js process / thread.
 *   - In a multi-worker cluster (e.g., PM2 cluster mode) or multi-instance deployment
 *     (e.g., multiple EC2 instances behind an AWS Application Load Balancer without
 *     sticky sessions), request counts are not synchronized across processes.
 *   - In such environments, effective limits are multiplied by the number of active
 *     nodes (N * limit).
 *   - When scaling horizontally in production, plug in a distributed store
 *     (e.g., rate-limit-redis with AWS ElastiCache Redis) into the `store` option.
 *
 * Proxy Security:
 *   - Client-controlled 'X-Forwarded-For' headers are NOT trusted by default.
 *   - Express `trust proxy` must be explicitly configured (via TRUST_PROXY env)
 *     when deployed behind an AWS ALB or CloudFront; otherwise req.ip resolves to
 *     the direct socket address.
 * ============================================================================
 */

/**
 * 1. Global API Rate Limiter
 * Applied across all /api routes to prevent broad DoS or resource exhaustion.
 * Default: 100 requests per 1 minute per IP.
 * Bypasses the AWS/ALB health check endpoint (/api/health).
 */
const globalApiLimiter = rateLimit({
  windowMs: config.rateLimit.globalWindowMs,
  limit: config.rateLimit.globalMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/api/health',
  handler: (req, res, _next, options) => {
    logger.warn('Global rate limit exceeded', {
      ip: req.ip,
      path: req.originalUrl || req.path,
    });
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many requests. Please slow down and try again shortly.',
    });
  },
});

/**
 * 2. Admin Login Rate Limiter
 * Protects POST /api/auth/login against credential stuffing and brute-force attacks.
 * Default: 5 attempts per 15 minutes per client IP.
 */
const loginLimiter = rateLimit({
  windowMs: config.rateLimit.loginWindowMs,
  limit: config.rateLimit.loginMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    logger.warn('Admin login rate limit exceeded', { ip: req.ip });
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many login attempts. Please try again after 15 minutes.',
    });
  },
});

/**
 * 3. Incident Creation Rate Limiter
 * Protects POST /api/incidents against spam, S3 storage bloat, DynamoDB write abuse,
 * and Groq AI token exhaustion.
 * Default: 10 creation attempts per 15 minutes per authenticated user.
 *
 * Security Note:
 *   Key is extracted from req.user.userId, which is cryptographically verified by
 *   Cognito JWT verification before this middleware executes. Unauthenticated requests
 *   cannot specify or forge this key.
 */
const incidentCreationLimiter = rateLimit({
  windowMs: config.rateLimit.incidentWindowMs,
  limit: config.rateLimit.incidentMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    if (req.user && req.user.userId) {
      return `user:${req.user.userId}`;
    }
    return `ip:${req.ip}`;
  },
  handler: (req, res, _next, options) => {
    logger.warn('Incident creation rate limit exceeded', {
      userId: req.user?.userId,
      ip: req.ip,
    });
    res.status(options.statusCode).json({
      success: false,
      message: 'Too many incident reports submitted. Please try again after 15 minutes.',
    });
  },
});

module.exports = {
  globalApiLimiter,
  loginLimiter,
  incidentCreationLimiter,
};
