const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const { SNSClient } = require('@aws-sdk/client-sns');
const config = require('./index');

// AWS SDK uses the default credential provider chain:
// 1. Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
// 2. Shared credentials file (~/.aws/credentials)
// 3. EC2 instance IAM role (when deployed)
const awsConfig = {
  region: config.awsRegion,
};

// DynamoDB
const dynamoClient = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// S3
const s3Client = new S3Client(awsConfig);

// SNS
const snsClient = new SNSClient(awsConfig);

module.exports = { docClient, s3Client, snsClient };
