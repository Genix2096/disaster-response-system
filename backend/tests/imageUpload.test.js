const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { validateImageBuffer, detectMagicBytes } = require('../src/utils/imageValidator');
const { validateImageFile } = require('../src/middleware/upload');
const s3Service = require('../src/services/s3Service');
const { s3Client } = require('../src/config/aws');

// Binary fixtures for standard image formats
function createValidJpegBuffer() {
  // 32-byte valid JPEG with SOI, APP0 marker, and JFIF identifier
  const header = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
    0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0xFF, 0xD9,
  ]);
  return header;
}

function createValidPngBuffer() {
  // 33-byte valid PNG header with signature and standard IHDR chunk
  const header = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D,                         // IHDR chunk length (13 bytes)
    0x49, 0x48, 0x44, 0x52,                         // 'IHDR'
    0x00, 0x00, 0x00, 0x01,                         // width: 1
    0x00, 0x00, 0x00, 0x01,                         // height: 1
    0x08, 0x02, 0x00, 0x00, 0x00,                   // bit depth, color type, etc.
    0x90, 0x77, 0x53, 0xDE                          // CRC
  ]);
  return header;
}

function createValidWebpBuffer() {
  // 24-byte WebP header: 'RIFF' + 4-byte len + 'WEBP' + 'VP8 ' + chunk data
  const header = Buffer.from([
    0x52, 0x49, 0x46, 0x46, // 'RIFF'
    0x14, 0x00, 0x00, 0x00, // length (20)
    0x57, 0x45, 0x42, 0x50, // 'WEBP'
    0x56, 0x50, 0x38, 0x20, // 'VP8 '
    0x08, 0x00, 0x00, 0x00, // chunk size
    0x30, 0x01, 0x00, 0x9D  // frame data
  ]);
  return header;
}

describe('UPLD-01: Image Validation & Safe Upload Pipeline', () => {
  let originalS3Send = null;

  beforeEach(() => {
    originalS3Send = s3Client.send;
  });

  afterEach(() => {
    s3Client.send = originalS3Send;
  });

  describe('Magic Byte Detection (detectMagicBytes)', () => {
    it('should correctly detect valid JPEG magic bytes', () => {
      const buffer = createValidJpegBuffer();
      const result = detectMagicBytes(buffer);
      assert.ok(result);
      assert.strictEqual(result.format.mime, 'image/jpeg');
      assert.strictEqual(result.format.extension, '.jpg');
    });

    it('should correctly detect valid PNG magic bytes and IHDR chunk', () => {
      const buffer = createValidPngBuffer();
      const result = detectMagicBytes(buffer);
      assert.ok(result);
      assert.strictEqual(result.format.mime, 'image/png');
      assert.strictEqual(result.format.extension, '.png');
    });

    it('should correctly detect valid WebP magic bytes and VP8 header', () => {
      const buffer = createValidWebpBuffer();
      const result = detectMagicBytes(buffer);
      assert.ok(result);
      assert.strictEqual(result.format.mime, 'image/webp');
      assert.strictEqual(result.format.extension, '.webp');
    });

    it('should reject text/plain or arbitrary binary that does not match image headers', () => {
      const textBuffer = Buffer.from('This is a plain text file pretending to be an image');
      assert.strictEqual(detectMagicBytes(textBuffer), null);
    });

    it('should reject truncated/malformed JPEG (< 32 bytes)', () => {
      const truncated = Buffer.from([0xFF, 0xD8, 0xFF, 0x00]);
      const result = detectMagicBytes(truncated);
      assert.ok(result);
      assert.strictEqual(result.malformed, true);
    });
  });

  describe('Comprehensive Image Buffer Validation (validateImageBuffer)', () => {
    it('should approve valid JPEG buffer with matching .jpg extension', () => {
      const buffer = createValidJpegBuffer();
      const result = validateImageBuffer(buffer, 'incident-photo.jpg');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.mime, 'image/jpeg');
      assert.strictEqual(result.extension, '.jpg');
    });

    it('should approve valid PNG buffer with matching .png extension', () => {
      const buffer = createValidPngBuffer();
      const result = validateImageBuffer(buffer, 'evidence.png');
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.mime, 'image/png');
      assert.strictEqual(result.extension, '.png');
    });

    it('should reject a spoofed MIME upload containing plain text or fake image data', () => {
      const fakeBuffer = Buffer.from('fake image content claiming to be jpeg');
      const result = validateImageBuffer(fakeBuffer, 'fake.jpg');
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /Invalid file format/);
    });

    it('should reject an extension mismatch (PNG content with .jpg extension)', () => {
      const pngBuffer = createValidPngBuffer();
      const result = validateImageBuffer(pngBuffer, 'disguised.jpg');
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /does not match detected image format/);
    });

    it('should reject HTML markup disguised with image extension', () => {
      const htmlBuffer = Buffer.from('<!DOCTYPE html><html><body><script>alert(1)</script></body></html>');
      const result = validateImageBuffer(htmlBuffer, 'attack.jpg');
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /Disallowed file content/);
    });

    it('should reject SVG vector markup disguised with image extension', () => {
      const svgBuffer = Buffer.from('<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
      const result = validateImageBuffer(svgBuffer, 'vector.png');
      assert.strictEqual(result.valid, false);
      assert.match(result.error, /Disallowed file content/);
    });

    it('should reject empty buffers or oversized buffers', () => {
      const emptyResult = validateImageBuffer(Buffer.alloc(0), 'empty.jpg');
      assert.strictEqual(emptyResult.valid, false);
      assert.match(emptyResult.error, /empty/);

      const oversized = Buffer.alloc(5 * 1024 * 1024 + 10);
      const oversizedResult = validateImageBuffer(oversized, 'huge.jpg');
      assert.strictEqual(oversizedResult.valid, false);
      assert.match(oversizedResult.error, /exceeds maximum allowed size/);
    });
  });

  describe('Middleware Execution (validateImageFile)', () => {
    it('should call next() without error when no file is uploaded', () => {
      const req = {};
      let nextCalled = false;
      const res = {};

      validateImageFile(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
    });

    it('should attach detectedMime and detectedExt and call next() for valid upload', () => {
      const req = {
        file: {
          buffer: createValidJpegBuffer(),
          originalname: 'report.jpeg',
          mimetype: 'image/jpeg',
        },
      };
      let nextCalled = false;
      const res = {};

      validateImageFile(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(req.file.detectedMime, 'image/jpeg');
      assert.strictEqual(req.file.detectedExt, '.jpg');
    });

    it('should return HTTP 400 when invalid or spoofed image is uploaded', () => {
      const req = {
        file: {
          buffer: Buffer.from('not an image'),
          originalname: 'fake.jpg',
          mimetype: 'image/jpeg',
        },
      };
      let statusCode = null;
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

      validateImageFile(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(statusCode, 400);
      assert.strictEqual(jsonBody.success, false);
      assert.match(jsonBody.message, /Invalid file format/);
    });
  });

  describe('S3 Service Upload Derivation', () => {
    it('should derive S3 object key extension and ContentType from validated image bytes', async () => {
      let putParams = null;
      s3Client.send = async (command) => {
        putParams = command.input;
        return {};
      };

      const mockFile = {
        buffer: createValidPngBuffer(),
        detectedMime: 'image/png',
        detectedExt: '.png',
        // Client maliciously claimed .jpg in originalname:
        originalname: 'tricky.jpg',
        mimetype: 'image/jpeg',
      };

      const key = await s3Service.uploadImage(mockFile, 'INC-TEST-S3-01');

      assert.ok(putParams);
      // Key must end in validated extension (.png), NOT client extension (.jpg)
      assert.match(key, /^incidents\/INC-TEST-S3-01\/[a-f0-9-]+\.png$/);
      // ContentType must be validated MIME (image/png), NOT client header (image/jpeg)
      assert.strictEqual(putParams.ContentType, 'image/png');
    });
  });

  describe('Incident Controller Image Upload Integration', () => {
    const incidentController = require('../src/controllers/incidentController');
    const dynamoService = require('../src/services/dynamoService');
    const groqService = require('../src/services/groqService');

    let originalDynamoCreate = null;
    let originalGroqSummary = null;

    beforeEach(() => {
      originalDynamoCreate = dynamoService.createIncident;
      originalGroqSummary = groqService.generateSummary;
    });

    afterEach(() => {
      dynamoService.createIncident = originalDynamoCreate;
      groqService.generateSummary = originalGroqSummary;
    });

    it('should reject incident creation with HTTP 400 when uploaded image is spoofed', async () => {
      let dynamoCalled = false;
      dynamoService.createIncident = async () => { dynamoCalled = true; };

      const req = {
        user: { userId: 'user-test-123' },
        body: {
          type: 'Fire',
          location: 'Main Street 100',
          description: 'Fire in the kitchen',
        },
        file: {
          buffer: Buffer.from('plain text pretending to be an image'),
          originalname: 'kitchen.jpg',
          mimetype: 'image/jpeg',
        },
      };

      let statusCode = null;
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

      await incidentController.createIncident(req, res, () => {});

      assert.strictEqual(statusCode, 400);
      assert.strictEqual(jsonBody.success, false);
      assert.match(jsonBody.message, /Invalid file format/);
      assert.strictEqual(dynamoCalled, false, 'DynamoDB creation should never be called for invalid uploads');
    });

    it('should successfully create incident without image attached', async () => {
      let createdIncident = null;
      dynamoService.createIncident = async (data) => {
        createdIncident = data;
        return data;
      };
      groqService.generateSummary = async () => 'Mock summary';

      const req = {
        user: { userId: 'user-test-123' },
        body: {
          type: 'Fire',
          location: 'Sector 4 Market',
          description: 'Small electric fire near shop',
        },
      };

      let statusCode = null;
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

      await incidentController.createIncident(req, res, () => {});

      assert.strictEqual(statusCode, 201);
      assert.strictEqual(jsonBody.success, true);
      assert.strictEqual(createdIncident.imageKey, null);
      assert.strictEqual(createdIncident.evidenceStrength, 'No photo evidence');
    });

    it('should successfully validate image, upload to S3, and create incident with valid JPEG', async () => {
      let s3UploadCalled = false;
      s3Client.send = async () => {
        s3UploadCalled = true;
        return {};
      };

      let createdIncident = null;
      dynamoService.createIncident = async (data) => {
        createdIncident = data;
        return data;
      };
      groqService.generateSummary = async () => 'Mock summary for verified photo';

      const validBuffer = createValidJpegBuffer();
      const req = {
        user: { userId: 'user-test-123' },
        body: {
          type: 'Fire',
          location: 'Sector 4 Market',
          description: 'Verified fire photo attached',
        },
        file: {
          buffer: validBuffer,
          originalname: 'fire.jpg',
          mimetype: 'image/jpeg',
        },
      };

      let statusCode = null;
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

      await incidentController.createIncident(req, res, () => {});

      assert.strictEqual(statusCode, 201);
      assert.strictEqual(jsonBody.success, true);
      assert.strictEqual(s3UploadCalled, true, 'S3 upload should be called for valid image');
      assert.ok(createdIncident.imageKey);
      assert.match(createdIncident.imageKey, /\.jpg$/);
    });
  });
});
