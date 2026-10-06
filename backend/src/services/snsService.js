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
    if (!topicArn) {
      logger.warn(`SNS Topic ARN not configured for ${department}. Skipping notification.`);
      return;
    }
    const params = {
      TopicArn: topicArn,
      Subject: `DISASTER ALERT: ${incident.type} at ${incident.location}`,
      Message: message,
    };
    try {
      await snsClient.send(new PublishCommand(params));
      logger.info(`SNS alert published to ${department}`, { incidentId: incident.incidentId });
    } catch (error) {
      logger.error(`Failed to publish SNS alert to ${department}`, { error, incidentId: incident.incidentId });
    }
  };

  const promises = [];
  if (incident.departments?.includes('FIRE')) {
    promises.push(publishToTopic(config.snsTopicArnFire, 'FIRE'));
  }
  if (incident.departments?.includes('POLICE')) {
    promises.push(publishToTopic(config.snsTopicArnPolice, 'POLICE'));
  }

  await Promise.allSettled(promises);
}

module.exports = { publishAlert };
