const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const config = require('../src/config');
const snsService = require('../src/services/snsService');
const { snsClient } = require('../src/config/aws');

describe('SECR-01: SNS Configuration & Department Routing', () => {
  const originalEnv = { ...process.env };
  let originalSend = null;

  beforeEach(() => {
    process.env = { ...originalEnv };
    originalSend = snsClient.send;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    snsClient.send = originalSend;
  });

  describe('Config Default Values (No Hardcoded Fallback ARNs)', () => {
    it('should default SNS topic ARNs to empty strings when environment variables are not set', () => {
      delete process.env.SNS_TOPIC_ARN;
      delete process.env.SNS_TOPIC_ARN_FIRE;
      delete process.env.SNS_TOPIC_ARN_POLICE;

      assert.strictEqual(config.snsTopicArn, '');
      assert.strictEqual(config.snsTopicArnFire, '');
      assert.strictEqual(config.snsTopicArnPolice, '');

      // Verify no hardcoded 12-digit account ID is leaked in config
      assert.doesNotMatch(config.snsTopicArnFire, /630583673900/);
      assert.doesNotMatch(config.snsTopicArnPolice, /630583673900/);
    });

    it('should read configured SNS topic ARNs dynamically from environment variables', () => {
      process.env.SNS_TOPIC_ARN_FIRE = 'arn:aws:sns:ap-south-1:111122223333:CustomFireAlerts';
      process.env.SNS_TOPIC_ARN_POLICE = 'arn:aws:sns:ap-south-1:111122223333:CustomPoliceAlerts';

      assert.strictEqual(config.snsTopicArnFire, 'arn:aws:sns:ap-south-1:111122223333:CustomFireAlerts');
      assert.strictEqual(config.snsTopicArnPolice, 'arn:aws:sns:ap-south-1:111122223333:CustomPoliceAlerts');
    });
  });

  describe('Notification Publishing Behavior', () => {
    it('should safely skip notification when SNS Topic ARN is missing/empty and not throw', async () => {
      delete process.env.SNS_TOPIC_ARN_FIRE;
      delete process.env.SNS_TOPIC_ARN_POLICE;

      let sendCalled = false;
      snsClient.send = async () => {
        sendCalled = true;
      };

      const testIncident = {
        incidentId: 'INC-TEST-001',
        type: 'Fire',
        priority: 'HIGH',
        location: 'Sector 5 Building',
        description: 'Smoke reported on 3rd floor',
        departments: ['FIRE'],
        createdAt: new Date().toISOString(),
      };

      const results = await snsService.publishAlert(testIncident);

      assert.strictEqual(sendCalled, false, 'SNS publish should not be called when ARN is unconfigured');
      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].department, 'FIRE');
      assert.strictEqual(results[0].status, 'skipped');
      assert.strictEqual(results[0].reason, 'ARN_NOT_CONFIGURED');
    });

    it('should publish to FIRE topic when configured and incident routes to FIRE', async () => {
      const fireArn = 'arn:aws:sns:ap-south-1:111122223333:DisasterAlerts-Fire';
      process.env.SNS_TOPIC_ARN_FIRE = fireArn;

      let publishedParams = null;
      snsClient.send = async (command) => {
        publishedParams = command.input;
        return { MessageId: 'mock-msg-fire-123' };
      };

      const testIncident = {
        incidentId: 'INC-TEST-002',
        type: 'Fire',
        priority: 'CRITICAL',
        location: 'Industrial Area Phase 2',
        description: 'Large warehouse fire spreading quickly',
        departments: ['FIRE'],
        createdAt: new Date().toISOString(),
      };

      const results = await snsService.publishAlert(testIncident);

      assert.ok(publishedParams);
      assert.strictEqual(publishedParams.TopicArn, fireArn);
      assert.match(publishedParams.Subject, /DISASTER ALERT: Fire at Industrial Area/);
      assert.match(publishedParams.Message, /Large warehouse fire/);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].department, 'FIRE');
      assert.strictEqual(results[0].status, 'published');
    });

    it('should publish to both FIRE and POLICE topics for Flood incidents', async () => {
      const fireArn = 'arn:aws:sns:ap-south-1:111122223333:DisasterAlerts-Fire';
      const policeArn = 'arn:aws:sns:ap-south-1:111122223333:DisasterAlerts-Police';
      process.env.SNS_TOPIC_ARN_FIRE = fireArn;
      process.env.SNS_TOPIC_ARN_POLICE = policeArn;

      const publishedTopics = [];
      snsClient.send = async (command) => {
        publishedTopics.push(command.input.TopicArn);
        return { MessageId: 'mock-msg-' + command.input.TopicArn };
      };

      const testIncident = {
        incidentId: 'INC-TEST-003',
        type: 'Flood',
        priority: 'HIGH',
        location: 'Riverbank Road',
        description: 'Water overflowing onto residential streets',
        departments: ['FIRE', 'POLICE'],
        createdAt: new Date().toISOString(),
      };

      const results = await snsService.publishAlert(testIncident);

      assert.strictEqual(publishedTopics.length, 2);
      assert.ok(publishedTopics.includes(fireArn));
      assert.ok(publishedTopics.includes(policeArn));

      assert.strictEqual(results.length, 2);
      assert.ok(results.every((r) => r.status === 'published'));
    });

    it('should fail safely and report failure without throwing when SNS send fails', async () => {
      process.env.SNS_TOPIC_ARN_FIRE = 'arn:aws:sns:ap-south-1:111122223333:DisasterAlerts-Fire';

      snsClient.send = async () => {
        throw new Error('AWS SNS ServiceUnavailable');
      };

      const testIncident = {
        incidentId: 'INC-TEST-004',
        type: 'Fire',
        priority: 'MEDIUM',
        location: 'Downtown',
        description: 'Minor trash fire',
        departments: ['FIRE'],
        createdAt: new Date().toISOString(),
      };

      const results = await snsService.publishAlert(testIncident);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].department, 'FIRE');
      assert.strictEqual(results[0].status, 'failed');
      assert.strictEqual(results[0].error, 'AWS SNS ServiceUnavailable');
    });
  });
});
