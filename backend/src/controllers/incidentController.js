const dynamoService = require('../services/dynamoService');
const s3Service = require('../services/s3Service');
const groqService = require('../services/groqService');
const snsService = require('../services/snsService');
const { generateIncidentId } = require('../utils/idGenerator');
const { determinePriority } = require('../utils/priority');
const exifr = require('exifr');
const logger = require('../utils/logger');

// Valid incident types
const VALID_TYPES = ['Fire', 'Flood', 'Accident', 'Road Damage', 'Building Damage', 'Other'];
const VALID_STATUSES = ['PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

/**
 * POST /api/incidents — Create a new incident (authenticated Cognito user).
 *
 * Ownership is taken ONLY from the verified Cognito token (req.user.userId).
 * Any `userId` sent in the request body is deliberately ignored.
 */
async function createIncident(req, res, next) {
  try {
    // Only these fields are read from the client — never userId.
    const { type, location, description } = req.body;
    const userId = req.user.userId;

    // --- Validation ---
    if (!type || !VALID_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid incident type. Must be one of: ${VALID_TYPES.join(', ')}`,
      });
    }
    if (!location || location.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Location is required.' });
    }
    if (location.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Location must be under 500 characters.' });
    }
    if (!description || description.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Description is required.' });
    }
    if (description.trim().length > 5000) {
      return res.status(400).json({ success: false, message: 'Description must be under 5000 characters.' });
    }

    const incidentId = generateIncidentId();
    const priority = determinePriority(type);
    const now = new Date().toISOString();

    logger.info('Creating new incident', { incidentId, type, priority, userId });

    // (AI summary will be generated after building the incident data)

    // Determine departments deterministically
    let departments = [];
    switch (type) {
      case 'Fire':
        departments = ['FIRE'];
        break;
      case 'Flood':
        departments = ['FIRE', 'POLICE'];
        break;
      case 'Accident':
      case 'Road Damage':
        departments = ['POLICE'];
        break;
      case 'Building Damage':
        departments = ['FIRE', 'POLICE'];
        break;
      case 'Other':
      default:
        departments = ['ADMIN_REVIEW'];
        break;
    }

    // Upload image to S3 if provided
    let imageKey = null;
    let photoHasGeotag = false;
    let photoLatitude = null;
    let photoLongitude = null;
    let evidenceStrength = 'No photo evidence';

    if (req.file) {
      try {
        imageKey = await s3Service.uploadImage(req.file, incidentId);
        evidenceStrength = 'Photo uploaded — no geolocation metadata';

        try {
          const exifData = await exifr.parse(req.file.buffer, { gps: true });
          if (exifData && exifData.latitude && exifData.longitude) {
            photoHasGeotag = true;
            photoLatitude = exifData.latitude;
            photoLongitude = exifData.longitude;
            evidenceStrength = 'Strong supporting evidence';
          }
        } catch (exifErr) {
          logger.warn('Failed to parse EXIF data', { error: exifErr, incidentId });
        }
      } catch (err) {
        logger.error('S3 image upload failed', { error: err, incidentId });
        // Continue without image — don't break the report
      }
    }

    // Build incident record
    const incident = {
      incidentId,
      userId,
      type,
      location: location.trim(),
      description: description.trim(),
      priority,
      status: 'PENDING',
      imageKey,
      photoHasGeotag,
      photoLatitude,
      photoLongitude,
      evidenceStrength,
      departments,
      isFake: false,
      createdAt: now,
      updatedAt: now,
    };

    // Generate AI summary with complete context
    const aiSummary = await groqService.generateSummary(incident);
    incident.aiSummary = aiSummary;

    // Store in DynamoDB
    await dynamoService.createIncident(incident);

    // Send SNS alert based on departments (non-blocking)
    snsService.publishAlert(incident).catch(() => {});

    // Return response (generate presigned URL if image exists)
    const response = { ...incident };
    if (imageKey) {
      try {
        response.imageUrl = await s3Service.getPresignedUrl(imageKey);
      } catch (err) {
        logger.error('Failed to generate presigned URL', { error: err });
      }
    }

    logger.info('Incident created successfully', { incidentId });
    res.status(201).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/incidents — Get all incidents (admin).
 */
async function getAllIncidents(req, res, next) {
  try {
    const incidents = await dynamoService.getAllIncidents();

    // Generate presigned URLs for images
    const enriched = await Promise.all(
      incidents.map(async (incident) => {
        const result = { ...incident };
        if (incident.imageKey) {
          try {
            result.imageUrl = await s3Service.getPresignedUrl(incident.imageKey);
          } catch (err) {
            logger.error('Failed to generate presigned URL', { error: err, incidentId: incident.incidentId });
          }
        }
        return result;
      })
    );

    res.json({ success: true, data: enriched, count: enriched.length });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/incidents/:id — Get single incident (admin).
 */
async function getIncidentById(req, res, next) {
  try {
    const { id } = req.params;
    const incident = await dynamoService.getIncidentById(id);

    if (!incident) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    const result = { ...incident };
    if (incident.imageKey) {
      try {
        result.imageUrl = await s3Service.getPresignedUrl(incident.imageKey);
      } catch (err) {
        logger.error('Failed to generate presigned URL', { error: err, incidentId: id });
      }
    }

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/incidents/:id/status — Update status (admin).
 */
async function updateStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    // Check if incident exists
    const existing = await dynamoService.getIncidentById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    const updated = await dynamoService.updateIncidentStatus(id, status);
    logger.info('Incident status updated', { incidentId: id, status });

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/incidents/:id — Delete incident (admin).
 */
async function deleteIncident(req, res, next) {
  try {
    const { id } = req.params;

    const existing = await dynamoService.getIncidentById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Incident not found.' });
    }

    // Delete image from S3 if it exists
    if (existing.imageKey) {
      try {
        await s3Service.deleteImage(existing.imageKey);
      } catch (err) {
        logger.error('Failed to delete S3 image', { error: err, incidentId: id });
      }
    }

    await dynamoService.deleteIncident(id);
    logger.info('Incident deleted', { incidentId: id });

    res.json({ success: true, message: 'Incident deleted successfully.' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createIncident,
  getAllIncidents,
  getIncidentById,
  updateStatus,
  deleteIncident,
};
