const { PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/aws');
const config = require('../config');
const logger = require('../utils/logger');

const TABLE_NAME = config.dynamoTableName;

/**
 * Create a new incident record in DynamoDB.
 */
async function createIncident(incident) {
  const params = {
    TableName: TABLE_NAME,
    Item: incident,
  };

  await docClient.send(new PutCommand(params));
  logger.info('Incident created in DynamoDB', { incidentId: incident.incidentId });
  return incident;
}

/**
 * Get a single incident by its ID.
 */
async function getIncidentById(incidentId) {
  const params = {
    TableName: TABLE_NAME,
    Key: { incidentId },
  };

  const result = await docClient.send(new GetCommand(params));
  return result.Item || null;
}

/**
 * Get all incidents. Returns sorted by createdAt descending (newest first).
 */
async function getAllIncidents() {
  const params = {
    TableName: TABLE_NAME,
  };

  const result = await docClient.send(new ScanCommand(params));
  const items = result.Items || [];

  // Sort newest first
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  logger.info('Fetched all incidents from DynamoDB', { count: items.length });
  return items;
}

/**
 * Update the status of an incident.
 */
async function updateIncidentStatus(incidentId, status) {
  const params = {
    TableName: TABLE_NAME,
    Key: { incidentId },
    UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: {
      ':status': status,
      ':updatedAt': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  };

  const result = await docClient.send(new UpdateCommand(params));
  logger.info('Incident status updated in DynamoDB', { incidentId, status });
  return result.Attributes;
}

/**
 * Delete an incident by ID.
 */
async function deleteIncident(incidentId) {
  const params = {
    TableName: TABLE_NAME,
    Key: { incidentId },
  };

  await docClient.send(new DeleteCommand(params));
  logger.info('Incident deleted from DynamoDB', { incidentId });
}

module.exports = {
  createIncident,
  getIncidentById,
  getAllIncidents,
  updateIncidentStatus,
  deleteIncident,
};
