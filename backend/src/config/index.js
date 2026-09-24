const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  // Server
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // AWS
  awsRegion: process.env.AWS_REGION || 'ap-south-1',

  // S3
  s3BucketName: process.env.S3_BUCKET_NAME || 'disaster-response-images-mural-2026',

  // DynamoDB
  dynamoTableName: process.env.DYNAMODB_TABLE_NAME || 'DisasterReports',

  // SNS
  snsTopicArn: process.env.SNS_TOPIC_ARN || '',

  // Groq
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',

  // Auth
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || '',
  jwtSecret: process.env.JWT_SECRET || '',

  // CORS
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};
