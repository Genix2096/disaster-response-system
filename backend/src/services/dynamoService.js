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
 * Get all incidents owned by a specific user (Cognito sub).
 * Filtering happens server-side in DynamoDB; legacy records without a
 * userId never match. Follows pagination because a filtered Scan only
 * evaluates 1 MB per page.
 */
async function getIncidentsByUserId(userId) {
  const items = [];
  let ExclusiveStartKey;

  do {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
      ExclusiveStartKey,
    }));
    items.push(...(result.Items || []));
    ExclusiveStartKey = result.LastEvaluatedKey;
  } while (ExclusiveStartKey);

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  logger.info('Fetched user incidents from DynamoDB', { userId, count: items.length });
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

/**
 * Mark an incident as fake.
 * Uses conditional expression to prevent marking an already fake incident, avoiding double-counting.
 */
async function markIncidentFake(incidentId, fakeReason, markedFakeBy, markedFakeAt) {
  const params = {
    TableName: TABLE_NAME,
    Key: { incidentId },
    UpdateExpression: 'SET isFake = :trueVal, fakeReason = :reason, markedFakeBy = :by, markedFakeAt = :at, updatedAt = :updatedAt',
    ConditionExpression: 'attribute_not_exists(isFake) OR isFake = :falseVal',
    ExpressionAttributeValues: {
      ':trueVal': true,
      ':falseVal': false,
      ':reason': fakeReason,
      ':by': markedFakeBy,
      ':at': markedFakeAt,
      ':updatedAt': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await docClient.send(new UpdateCommand(params));
    logger.info('Incident marked as fake', { incidentId, markedFakeBy });
    return result.Attributes;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      const existing = await getIncidentById(incidentId);
      if (!existing) {
        throw new Error('Incident not found.');
      }
      throw new Error('Incident is already marked as fake.');
    }
    throw error;
  }
}

module.exports = {
  createIncident,
  getIncidentById,
  getAllIncidents,
  getIncidentsByUserId,
  updateIncidentStatus,
  deleteIncident,
  markIncidentFake,
};
