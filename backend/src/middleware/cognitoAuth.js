const { CognitoJwtVerifier } = require('aws-jwt-verify');
const config = require('../config');
const logger = require('../utils/logger');
const userService = require('../services/userService');

/**
 * Cognito authentication for NORMAL USERS.
 *
 * This is intentionally separate from the admin JWT middleware (./auth.js).
 * Admin tokens (HS256, signed with JWT_SECRET) are NOT accepted here, and
 * Cognito tokens are NOT accepted by the admin middleware.
 *
 * The token is cryptographically verified against the user pool's JWKS
 * (signature, issuer, expiry, audience/client_id and token_use). Nothing
 * from an unverified payload — or from the request body/query — is trusted.
 */

let verifier = null;

function getVerifier() {
  if (!verifier) {
    if (!config.cognitoUserPoolId || !config.cognitoClientId) {
      return null;
    }
    verifier = CognitoJwtVerifier.create({
      userPoolId: config.cognitoUserPoolId,
      // ID token: carries the verified `email` and `cognito:username` claims,
      // which are used to provision the DisasterUsers profile.
      tokenUse: 'id',
      clientId: config.cognitoClientId,
    });
  }
  return verifier;
}

/**
 * authenticateUser
 * 1. Read the Authorization header
 * 2. Extract the Bearer token
 * 3. Verify the Cognito JWT (pool + client)
 * 4. Attach req.user = { userId: <sub>, username, email }
 */
async function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const jwtVerifier = getVerifier();

  if (!jwtVerifier) {
    logger.error('Cognito is not configured (COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID missing)');
    return res.status(500).json({
      success: false,
      message: 'Authentication service unavailable.',
    });
  }

  try {
    const payload = await jwtVerifier.verify(token);

    req.user = {
      userId: payload.sub, // permanent application user ID
      username: payload['cognito:username'],
      email: payload.email,
    };
    next();
  } catch (error) {
    logger.warn('Invalid Cognito token attempt', { reason: error.name });
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired session. Please log in again.',
    });
  }
}

/**
 * loadUserProfile — must run after authenticateUser.
 * Gets (or safely creates, exactly once) the DisasterUsers profile for the
 * verified user and attaches it as req.userProfile.
 */
async function loadUserProfile(req, res, next) {
  try {
    req.userProfile = await userService.getOrCreateUserProfile(req.user);
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * requireActiveAccount — must run after loadUserProfile.
 * Only ACTIVE accounts may perform write actions (e.g. create incidents).
 * The SUSPENDED state itself is managed in Phase 2.
 */
function requireActiveAccount(req, res, next) {
  if (req.userProfile?.accountStatus !== userService.ACCOUNT_STATUS.ACTIVE) {
    return res.status(403).json({
      success: false,
      message: 'Your account is not active. You cannot submit incidents.',
    });
  }
  next();
}

module.exports = { authenticateUser, loadUserProfile, requireActiveAccount };
