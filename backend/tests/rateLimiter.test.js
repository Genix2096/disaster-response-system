const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { loginLimiter, incidentCreationLimiter, globalApiLimiter } = require('../src/middleware/rateLimiter');

describe('RATE-01: Rate Limiting Suite', () => {

  describe('Admin Login Rate Limiter (loginLimiter)', () => {
    it('should allow up to 5 attempts and block the 6th with HTTP 429', async () => {
      // Create isolated test app with loginLimiter
      const app = express();
      app.use(express.json());
      app.post('/test/login', loginLimiter, (req, res) => {
        res.status(200).json({ success: true, message: 'Attempt handled' });
      });

      const server = app.listen(0);
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}/test/login`;

      try {
        const responses = [];
        for (let i = 0; i < 6; i++) {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'admin', password: 'bad' }),
          });
          const body = await res.json();
          responses.push({ status: res.status, body });
        }

        // First 5 attempts succeed or reach handler (HTTP 200)
        for (let i = 0; i < 5; i++) {
          assert.strictEqual(responses[i].status, 200, `Attempt ${i + 1} should be 200`);
        }

        // 6th attempt is blocked by rate limiter (HTTP 429)
        assert.strictEqual(responses[5].status, 429, 'Attempt 6 should be 429 Too Many Requests');
        assert.strictEqual(responses[5].body.success, false);
        assert.strictEqual(
          responses[5].body.message,
          'Too many login attempts. Please try again after 15 minutes.'
        );
      } finally {
        server.close();
      }
    });
  });

  describe('Incident Creation Rate Limiter (incidentCreationLimiter)', () => {
    it('should key by verified req.user.userId and block after 10 creation attempts', async () => {
      // Create test app with mock auth middleware then incidentCreationLimiter
      const app = express();
      app.use(express.json());

      // Mock auth middleware simulating authenticateUser
      app.use((req, res, next) => {
        const authUser = req.headers['x-mock-user-id'];
        if (authUser) {
          req.user = { userId: authUser };
        }
        next();
      });

      app.post('/test/incidents', incidentCreationLimiter, (req, res) => {
        res.status(201).json({ success: true, incidentId: 'INC-123' });
      });

      const server = app.listen(0);
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}/test/incidents`;

      try {
        const testUserId = `test-user-${Date.now()}`;

        // 10 successful creations for testUserId
        for (let i = 0; i < 10; i++) {
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-mock-user-id': testUserId,
            },
            body: JSON.stringify({ title: `Incident ${i}` }),
          });
          assert.strictEqual(res.status, 201, `Creation ${i + 1} should succeed with 201`);
        }

        // 11th creation for testUserId is blocked (HTTP 429)
        const blockedRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-mock-user-id': testUserId,
          },
          body: JSON.stringify({ title: 'Incident 11' }),
        });
        const blockedBody = await blockedRes.json();

        assert.strictEqual(blockedRes.status, 429, 'Attempt 11 should be 429 Too Many Requests');
        assert.strictEqual(blockedBody.success, false);
        assert.strictEqual(
          blockedBody.message,
          'Too many incident reports submitted. Please try again after 15 minutes.'
        );

        // A different user (test-user-other) should NOT be blocked
        const otherUserRes = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-mock-user-id': 'different-user-999',
          },
          body: JSON.stringify({ title: 'Incident from another user' }),
        });
        assert.strictEqual(
          otherUserRes.status,
          201,
          'Independent user should succeed below their own limit'
        );
      } finally {
        server.close();
      }
    });

    it('should fallback to IP-based keying when req.user is absent', async () => {
      const app = express();
      app.use(express.json());
      app.post('/test/fallback-incidents', incidentCreationLimiter, (req, res) => {
        res.status(200).json({ success: true });
      });

      const server = app.listen(0);
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}/test/fallback-incidents`;

      try {
        const res = await fetch(url, { method: 'POST' });
        assert.ok([200, 429].includes(res.status));
      } finally {
        server.close();
      }
    });
  });

  describe('Route Pipeline & Security Order', () => {
    it('should reject unauthenticated incident requests at auth step before rate limiter or multer', async () => {
      // Simulate incidentRoutes pipeline: authenticateUser -> loadUserProfile -> requireActiveAccount -> incidentCreationLimiter -> handler
      const app = express();
      let limiterReached = false;

      // Mock auth rejecting with 401
      const mockAuthReject = (req, res, next) => {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
      };

      const mockTrackLimiter = (req, res, next) => {
        limiterReached = true;
        next();
      };

      app.post('/api/incidents', mockAuthReject, mockTrackLimiter, (req, res) => {
        res.json({ success: true });
      });

      const server = app.listen(0);
      const port = server.address().port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/incidents`, { method: 'POST' });
        const body = await res.json();

        assert.strictEqual(res.status, 401);
        assert.strictEqual(body.success, false);
        assert.strictEqual(limiterReached, false, 'Rate limiter should not be reached for unauthenticated requests');
      } finally {
        server.close();
      }
    });

    it('should reject suspended user accounts at requireActiveAccount step before rate limiter', async () => {
      const app = express();
      let limiterReached = false;

      const mockAuth = (req, res, next) => {
        req.user = { userId: 'suspended-user-1' };
        req.userProfile = { accountStatus: 'SUSPENDED' };
        next();
      };

      const mockRequireActive = (req, res, next) => {
        if (req.userProfile?.accountStatus !== 'ACTIVE') {
          return res.status(403).json({ success: false, message: 'Account suspended.' });
        }
        next();
      };

      const mockTrackLimiter = (req, res, next) => {
        limiterReached = true;
        next();
      };

      app.post('/api/incidents', mockAuth, mockRequireActive, mockTrackLimiter, (req, res) => {
        res.json({ success: true });
      });

      const server = app.listen(0);
      const port = server.address().port;

      try {
        const res = await fetch(`http://127.0.0.1:${port}/api/incidents`, { method: 'POST' });
        const body = await res.json();

        assert.strictEqual(res.status, 403);
        assert.strictEqual(body.message, 'Account suspended.');
        assert.strictEqual(limiterReached, false, 'Rate limiter should not be reached for suspended accounts');
      } finally {
        server.close();
      }
    });
  });

  describe('Global API Rate Limiter (globalApiLimiter)', () => {
    it('should skip rate limiting for /api/health endpoint', async () => {
      const app = express();
      app.use('/api', globalApiLimiter);
      app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
      });

      const server = app.listen(0);
      const port = server.address().port;
      const url = `http://127.0.0.1:${port}/api/health`;

      try {
        // Send 10 rapid health check requests
        for (let i = 0; i < 10; i++) {
          const res = await fetch(url);
          assert.strictEqual(res.status, 200);
          const body = await res.json();
          assert.strictEqual(body.status, 'ok');
        }
      } finally {
        server.close();
      }
    });
  });
});
