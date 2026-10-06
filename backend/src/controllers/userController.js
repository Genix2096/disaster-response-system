const dynamoService = require('../services/dynamoService');
const s3Service = require('../services/s3Service');
const logger = require('../utils/logger');

/**
 * All handlers here run after authenticateUser + loadUserProfile.
 * The user's identity comes ONLY from the verified Cognito token
 * (req.user.userId). userId is never read from params, query or body.
 */

/** Attach a short-lived presigned image URL, if the incident has an image. */
async function withImageUrl(incident) {
  const result = { ...incident };
  if (incident.imageKey) {
    try {
      result.imageUrl = await s3Service.getPresignedUrl(incident.imageKey);
    } catch (err) {
      logger.error('Failed to generate presigned URL', { error: err, incidentId: incident.incidentId });
    }
  }
  return result;
}

/**
 * GET /api/users/me — Current user's DisasterUsers profile.
 */
async function getMe(req, res) {
  const { userId, username, email, riskScore, fakeIncidentCount, accountStatus, createdAt, updatedAt } = req.userProfile;
  res.json({
    success: true,
    data: { userId, username, email, riskScore, fakeIncidentCount, accountStatus, createdAt, updatedAt },
  });
}

/**
 * GET /api/users/me/incidents — Only incidents owned by the current user.
 */
async function getMyIncidents(req, res, next) {
  try {
    const incidents = await dynamoService.getIncidentsByUserId(req.user.userId);
    const enriched = await Promise.all(incidents.map(withImageUrl));
    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/users/me/incidents/:id — One incident, only if owned by the current user.
 */
async function getMyIncidentById(req, res, next) {
  try {
    const { id } = req.params;
    const incident = await dynamoService.getIncidentById(id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    // Legacy incidents (no userId) and other users' incidents are not accessible.
    if (!incident.userId || incident.userId !== req.user.userId) {
      logger.warn('Forbidden incident access attempt', { incidentId: id, userId: req.user.userId });
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this incident.',
      });
    }

    res.json({ success: true, data: await withImageUrl(incident) });
  } catch (error) {
    next(error);
  }
}

module.exports = { getMe, getMyIncidents, getMyIncidentById };
