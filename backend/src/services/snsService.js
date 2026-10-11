const { PublishCommand } = require('@aws-sdk/client-sns');
const { snsClient } = require('../config/aws');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Publish an alert to SNS topics based on departments.
 * Failure is logged but does NOT prevent incident creation.
 */
async function publishAlert(incident) {
  const message = `
DISASTER RESPONSE ALERT

Incident ID: ${incident.incidentId}
Type: ${incident.type}
Priority: ${incident.priority}
Location: ${incident.location}

Description:
${incident.description}

Evidence:
Photo uploaded: ${incident.imageKey ? 'Yes' : 'No'}
Geotag available: ${incident.photoHasGeotag ? 'Yes' : 'No'}
Evidence strength: ${incident.evidenceStrength || 'No photo evidence'}

Reported at: ${incident.createdAt}
  `.trim();

  const publishToTopic = async (topicArn, department) => {
    if (!topicArn || typeof topicArn !== 'string' || topicArn.trim() === '') {
      logger.warn(`SNS Topic ARN not configured for ${department}. Notification skipped.`);
      return { department, status: 'skipped', reason: 'ARN_NOT_CONFIGURED' };
    }
    const params = {
      TopicArn: topicArn.trim(),
      Subject: `DISASTER ALERT: ${incident.type} at ${incident.location}`,
      Message: message,
    };
    try {
      await snsClient.send(new PublishCommand(params));
      logger.info(`SNS alert published to ${department}`, { incidentId: incident.incidentId });
      return { department, status: 'published' };
    } catch (error) {
      logger.error(`Failed to publish SNS alert to ${department}`, {
        error: error.message,
        incidentId: incident.incidentId,
      });
      return { department, status: 'failed', error: error.message };
    }
  };

  const promises = [];
  if (incident.departments?.includes('FIRE')) {
    promises.push(publishToTopic(config.snsTopicArnFire, 'FIRE'));
  }
  if (incident.departments?.includes('POLICE')) {
    promises.push(publishToTopic(config.snsTopicArnPolice, 'POLICE'));
  }

  const results = await Promise.allSettled(promises);
  return results.map((r) => (r.status === 'fulfilled' ? r.value : { status: 'rejected', error: r.reason }));
}

module.exports = { publishAlert };
