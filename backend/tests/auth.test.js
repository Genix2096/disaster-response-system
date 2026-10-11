const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const config = require('../src/config');
const authMiddleware = require('../src/middleware/auth');
const authController = require('../src/controllers/authController');

describe('AUTH-01: Admin JWT Authentication & Secret Validation', () => {
  const originalEnv = { ...process.env };
  const TEST_SECRET = 'a-very-strong-32-char-test-secret-key-12345';

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('Startup Configuration Validation', () => {
    it('should throw a fatal error in production when JWT_SECRET is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;

      assert.throws(
        () => config.validateStartupConfig(),
        /Fatal configuration error: JWT_SECRET must be configured in production\./
      );
    });

    it('should throw a fatal error in production when JWT_SECRET is whitespace-only', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = '   \t  ';

      assert.throws(
        () => config.validateStartupConfig(),
        /Fatal configuration error: JWT_SECRET must be configured in production\./
      );
    });

    it('should throw a fatal error in production when JWT_SECRET is less than 32 characters', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short-secret';

      assert.throws(
        () => config.validateStartupConfig(),
        /at least 32 characters long in production/
      );
    });

    it('should pass validation in production when JWT_SECRET is >= 32 characters', () => {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = TEST_SECRET;

      assert.doesNotThrow(() => config.validateStartupConfig());
    });

    it('should allow startup in development mode without throwing even if JWT_SECRET is missing', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;

      assert.doesNotThrow(() => config.validateStartupConfig());
    });
  });

  describe('Admin Auth Middleware (authMiddleware)', () => {
    it('should reject requests with HTTP 401 when Authorization header is missing', () => {
      const req = { headers: {} };
      let statusCode = 200;
      let jsonBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 401);
      assert.strictEqual(jsonBody.success, false);
      assert.strictEqual(jsonBody.message, 'Access denied. No token provided.');
    });

    it('should reject requests with HTTP 500 when JWT_SECRET is missing or empty string', () => {
      process.env.JWT_SECRET = '';

      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImFkbWluIiwicm9sZSI6ImFkbWluIn0.mockSignature';
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      let statusCode = 200;
      let jsonBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 500);
      assert.strictEqual(jsonBody.success, false);
      assert.strictEqual(jsonBody.message, 'Authentication service unavailable.');
    });

    it('should reject requests with HTTP 500 when JWT_SECRET is whitespace-only', () => {
      process.env.JWT_SECRET = '   ';

      const req = {
        headers: {
          authorization: 'Bearer some.dummy.token',
        },
      };
      let statusCode = 200;
      let jsonBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 500);
      assert.strictEqual(jsonBody.success, false);
      assert.strictEqual(jsonBody.message, 'Authentication service unavailable.');
    });

    it('should successfully authenticate and attach req.admin when valid admin token is provided', () => {
      process.env.JWT_SECRET = TEST_SECRET;
      const token = jwt.sign(
        { username: 'admin', role: 'admin' },
        TEST_SECRET,
        { algorithm: 'HS256', expiresIn: '1h' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };
      const res = {};
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.ok(req.admin);
      assert.strictEqual(req.admin.username, 'admin');
      assert.strictEqual(req.admin.role, 'admin');
    });

    it('should reject invalid/tampered tokens with HTTP 401', () => {
      process.env.JWT_SECRET = TEST_SECRET;
      const invalidToken = jwt.sign(
        { username: 'admin', role: 'admin' },
        'wrong-secret-key-that-does-not-match',
        { algorithm: 'HS256' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      };
      let statusCode = 200;
      let jsonBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 401);
      assert.strictEqual(jsonBody.message, 'Invalid or expired token.');
    });

    it('should reject valid tokens that have non-admin role with HTTP 403', () => {
      process.env.JWT_SECRET = TEST_SECRET;
      const userToken = jwt.sign(
        { username: 'normal-user', role: 'user' },
        TEST_SECRET,
        { algorithm: 'HS256' }
      );

      const req = {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      };
      let statusCode = 200;
      let jsonBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };
      let nextCalled = false;

      authMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 403);
      assert.strictEqual(jsonBody.message, 'Admin access required.');
    });
  });

  describe('Admin Login Controller (authController.login)', () => {
    it('should return HTTP 500 when JWT_SECRET is not configured or empty', async () => {
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_PASSWORD = 'password123';
      process.env.JWT_SECRET = '';

      const req = {
        body: {
          username: 'admin',
          password: 'password123',
        },
      };
      let statusCode = 200;
      let jsonBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await authController.login(req, res, () => {});

      assert.strictEqual(statusCode, 500);
      assert.strictEqual(jsonBody.success, false);
      assert.strictEqual(jsonBody.message, 'Authentication service unavailable.');
    });

    it('should return token when valid credentials and JWT_SECRET are provided', async () => {
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_PASSWORD = 'password123';
      process.env.JWT_SECRET = TEST_SECRET;

      const req = {
        body: {
          username: 'admin',
          password: 'password123',
        },
      };
      let statusCode = 200;
      let jsonBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await authController.login(req, res, () => {});

      assert.strictEqual(statusCode, 200);
      assert.ok(jsonBody.success);
      assert.ok(jsonBody.data.token);
      assert.strictEqual(jsonBody.data.username, 'admin');

      // Verify token payload
      const decoded = jwt.verify(jsonBody.data.token, TEST_SECRET, { algorithms: ['HS256'] });
      assert.strictEqual(decoded.username, 'admin');
      assert.strictEqual(decoded.role, 'admin');
    });

    it('should return HTTP 401 when invalid credentials are provided', async () => {
      process.env.ADMIN_USERNAME = 'admin';
      process.env.ADMIN_PASSWORD = 'password123';
      process.env.JWT_SECRET = TEST_SECRET;

      const req = {
        body: {
          username: 'admin',
          password: 'wrongpassword',
        },
      };
      let statusCode = 200;
      let jsonBody = null;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(body) {
          jsonBody = body;
          return this;
        },
      };

      await authController.login(req, res, () => {});

      assert.strictEqual(statusCode, 401);
      assert.strictEqual(jsonBody.success, false);
      assert.strictEqual(jsonBody.message, 'Invalid credentials.');
    });
  });
});
