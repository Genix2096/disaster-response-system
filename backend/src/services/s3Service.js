const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { s3Client } = require('../config/aws');
const config = require('../config');
const logger = require('../utils/logger');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const { detectMagicBytes } = require('../utils/imageValidator');

const BUCKET_NAME = config.s3BucketName;

/**
 * Upload an image buffer to S3.
 * Derives object extension and ContentType strictly from validated binary format.
 * Returns the S3 object key (not a public URL).
 */
async function uploadImage(file, incidentId) {
  let ext = file.detectedExt;
  let contentType = file.detectedMime;

  if (!ext || !contentType) {
    const detection = detectMagicBytes(file.buffer);
    if (!detection || !detection.format) {
      throw new Error('Cannot upload image to S3: Unrecognized or invalid file format.');
    }
    ext = detection.format.extension;
    contentType = detection.format.mime;
  }

  const uniqueName = `${uuidv4()}${ext}`;
  const key = `incidents/${incidentId}/${uniqueName}`;

  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file.buffer,
    ContentType: contentType,
  };

  await s3Client.send(new PutObjectCommand(params));
  logger.info('Image uploaded to S3', { incidentId, key, contentType });
  return key;
}

/**
 * Generate a temporary presigned URL for viewing a private S3 object.
 * Expires in 15 minutes by default.
 */
async function getPresignedUrl(key, expiresIn = 900) {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Delete an object from S3.
 */
async function deleteImage(key) {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key,
  };

  await s3Client.send(new DeleteObjectCommand(params));
  logger.info('Image deleted from S3', { key });
}

module.exports = { uploadImage, getPresignedUrl, deleteImage };
