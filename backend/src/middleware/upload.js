const multer = require('multer');
const path = require('path');

// Allowed image MIME types
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

// Max file size: 5 MB
const MAX_SIZE = 5 * 1024 * 1024;

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WEBP images are allowed.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

const { validateImageBuffer } = require('../utils/imageValidator');
const logger = require('../utils/logger');

/**
 * Middleware executed after multer stores the file in memory.
 * Validates actual binary magic bytes, integrity, and checks for disallowed scripts/markup.
 */
function validateImageFile(req, res, next) {
  if (!req.file) {
    // Images are optional on incident reports
    return next();
  }

  const result = validateImageBuffer(req.file.buffer, req.file.originalname);

  if (!result.valid) {
    logger.warn('Uploaded file rejected by image validator', {
      error: result.error,
      originalname: req.file.originalname,
      clientMimetype: req.file.mimetype,
    });
    return res.status(400).json({
      success: false,
      message: result.error,
    });
  }

  // Populate verified MIME and extension so downstream services don't rely on client headers
  req.file.detectedMime = result.mime;
  req.file.detectedExt = result.extension;
  next();
}

upload.validateImageFile = validateImageFile;

module.exports = upload;
module.exports.upload = upload;
module.exports.validateImageFile = validateImageFile;

