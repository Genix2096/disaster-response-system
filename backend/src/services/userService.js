const { GetCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../config/aws');
const config = require('../config');
const logger = require('../utils/logger');

const USERS_TABLE = config.dynamoUsersTableName;

const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED', // reserved for Phase 2
});

/**
 * Get a user profile from DisasterUsers by userId (Cognito sub).
 */
async function getUserById(userId) {
  const result = await docClient.send(new GetCommand({
    TableName: USERS_TABLE,
    Key: { userId },
  }));
  return result.Item || null;
}

/**
 * Create the user's application profile exactly once.
 *
 * Uses a conditional put (attribute_not_exists) so concurrent first requests,
 * or a Cognito user that already exists without a profile, can never create
 * duplicates or overwrite an existing profile (e.g. its riskScore/status).
 *
 * Never stores passwords, hashes, or any Cognito/AWS secrets.
 */
async function createUserProfile({ userId, username, email }) {
  const now = new Date().toISOString();
  const profile = {
    userId,
    username: username || null,
    email: email || null,
    riskScore: 0,
    fakeIncidentCount: 0,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await docClient.send(new PutCommand({
      TableName: USERS_TABLE,
      Item: profile,
      ConditionExpression: 'attribute_not_exists(userId)',
    }));
    logger.info('User profile created in DynamoDB', { userId });
    return profile;
  } catch (error) {
    if (error.name === 'ConditionalCheckFailedException') {
      // Another request created it first — return the stored profile.
      return getUserById(userId);
    }
    throw error;
  }
}

/**
 * Return the existing profile, or provision it on the first verified request.
 * `identity` must come from a VERIFIED Cognito token (req.user).
 */
async function getOrCreateUserProfile(identity) {
  const existing = await getUserById(identity.userId);
  if (existing) return existing;
  return createUserProfile(identity);
}

module.exports = {
  ACCOUNT_STATUS,
  getUserById,
  createUserProfile,
  getOrCreateUserProfile,
};
