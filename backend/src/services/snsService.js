const { PublishCommand } = require('@aws-sdk/client-sns');
const { snsClient } = require('../config/aws');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Publish a HIGH priority incident alert to the SNS topic.
 * Failure is logged but does NOT prevent incident creation.
 */
async function publishHighPriorityAlert(incident) {
  if (!config.snsTopicArn) {
    logger.warn('SNS_TOPIC_ARN not configured. Skipping SNS notification.');
    return;
  }

  const message = `
🚨 HIGH PRIORITY INCIDENT 🚨

Incident ID: ${incident.incidentId}
Type: ${incident.type}
Location: ${incident.location}
Priority: ${incident.priority}

Summary:
${incident.aiSummary}

Reported At: ${incident.createdAt}
  `.trim();

  const params = {
    TopicArn: config.snsTopicArn,
    Subject: `🚨 HIGH PRIORITY: ${incident.type} at ${incident.location}`,
    Message: message,
  };

  try {
    await snsClient.send(new PublishCommand(params));
    logger.info('SNS alert published', { incidentId: incident.incidentId });
  } catch (error) {
    // SNS failure should NOT break incident creation
    logger.error('Failed to publish SNS alert', { error, incidentId: incident.incidentId });
  }
}

module.exports = { publishHighPriorityAlert };
