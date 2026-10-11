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
  dynamoUsersTableName: process.env.DYNAMODB_USERS_TABLE_NAME || 'DisasterUsers',

  // Cognito (normal user authentication — separate from admin JWT auth)
  cognitoRegion: process.env.COGNITO_REGION || 'ap-south-1',
  cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || '',
  cognitoClientId: process.env.COGNITO_CLIENT_ID || '',

  // SNS
  get snsTopicArn() {
    return (process.env.SNS_TOPIC_ARN || '').trim();
  },
  get snsTopicArnFire() {
    return (process.env.SNS_TOPIC_ARN_FIRE || '').trim();
  },
  get snsTopicArnPolice() {
    return (process.env.SNS_TOPIC_ARN_POLICE || '').trim();
  },

  // Groq
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',

  // Auth
  get adminUsername() {
    return process.env.ADMIN_USERNAME || 'admin';
  },
  get adminPassword() {
    return process.env.ADMIN_PASSWORD || '';
  },
  get jwtSecret() {
    const raw = process.env.JWT_SECRET || '';
    return typeof raw === 'string' ? raw.trim() : '';
  },

  // CORS & Network
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  trustProxy: process.env.TRUST_PROXY || false,

  // Rate Limiting
  rateLimit: {
    loginMax: parseInt(process.env.RATE_LIMIT_LOGIN_MAX, 10) || 5,
    loginWindowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
    incidentMax: parseInt(process.env.RATE_LIMIT_INCIDENT_MAX, 10) || 10,
    incidentWindowMs: parseInt(process.env.RATE_LIMIT_INCIDENT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 min
    globalMax: parseInt(process.env.RATE_LIMIT_GLOBAL_MAX, 10) || 100,
    globalWindowMs: parseInt(process.env.RATE_LIMIT_GLOBAL_WINDOW_MS, 10) || 60 * 1000, // 1 min
  },

  /**
   * Validate configuration at startup.
   * Fails safely in production if JWT_SECRET is missing or weak (< 32 characters).
   * Warns in development without exposing secret contents.
   */
  validateStartupConfig() {
    const isProduction = (process.env.NODE_ENV || 'development') === 'production';
    const rawSecret = process.env.JWT_SECRET || '';
    const secret = typeof rawSecret === 'string' ? rawSecret.trim() : '';

    if (isProduction) {
      if (!secret) {
        throw new Error('Fatal configuration error: JWT_SECRET must be configured in production.');
      }
      if (secret.length < 32) {
        throw new Error('Fatal configuration error: JWT_SECRET must be at least 32 characters long in production for secure HMAC-SHA256 signing.');
      }
    }
  },
};

