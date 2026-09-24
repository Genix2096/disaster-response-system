/**
 * Structured console logger for CloudWatch-compatible logging.
 * When deployed on EC2, CloudWatch agent can collect these logs.
 */
const logger = {
  info: (message, data = {}) => {
    console.log(JSON.stringify({
      level: 'INFO',
      timestamp: new Date().toISOString(),
      message,
      ...data,
    }));
  },

  warn: (message, data = {}) => {
    console.warn(JSON.stringify({
      level: 'WARN',
      timestamp: new Date().toISOString(),
      message,
      ...data,
    }));
  },

  error: (message, data = {}) => {
    console.error(JSON.stringify({
      level: 'ERROR',
      timestamp: new Date().toISOString(),
      message,
      ...(data.error instanceof Error
        ? { error: data.error.message, stack: data.error.stack }
        : data),
    }));
  },
};

module.exports = logger;
