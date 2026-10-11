const path = require('path');

// Maximum allowed image size: 5 MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Allowed image formats and their corresponding signatures
const ALLOWED_FORMATS = {
  JPEG: {
    mime: 'image/jpeg',
    extension: '.jpg',
    allowedExtensions: ['.jpg', '.jpeg'],
  },
  PNG: {
    mime: 'image/png',
    extension: '.png',
    allowedExtensions: ['.png'],
  },
  WEBP: {
    mime: 'image/webp',
    extension: '.webp',
    allowedExtensions: ['.webp'],
  },
};

/**
 * Detect image format using standard binary magic bytes.
 * Returns format specification or null if unsupported.
 */
function detectMagicBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return null;
  }

  // 1. JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    // Minimum valid JPEG with SOI, marker, and headers
    if (buffer.length < 32) {
      return { format: null, malformed: true, reason: 'JPEG file is too small or truncated.' };
    }
    return { format: ALLOWED_FORMATS.JPEG };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    // Standard PNG requires an IHDR chunk (ASCII 'IHDR') starting at byte index 12
    if (buffer.length < 24) {
      return { format: null, malformed: true, reason: 'PNG file is too small to contain valid headers.' };
    }
    const chunkType = buffer.toString('ascii', 12, 16);
    if (chunkType !== 'IHDR') {
      return { format: null, malformed: true, reason: 'PNG header missing required IHDR chunk.' };
    }
    return { format: ALLOWED_FORMATS.PNG };
  }

  // 3. WebP: 'RIFF' at 0..3 and 'WEBP' at 8..11
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    if (buffer.length < 16) {
      return { format: null, malformed: true, reason: 'WebP container is incomplete.' };
    }
    const vp8Header = buffer.toString('ascii', 12, 16);
    if (!['VP8 ', 'VP8L', 'VP8X'].includes(vp8Header)) {
      return { format: null, malformed: true, reason: 'WebP container missing valid VP8 chunk header.' };
    }
    return { format: ALLOWED_FORMATS.WEBP };
  }

  return null;
}

/**
 * Scan buffer for disallowed HTML, script, or SVG markup.
 * Inspects initial and trailing segments for text payloads.
 */
function containsDisallowedMarkup(buffer) {
  // Sample up to first 2048 bytes and last 512 bytes
  const headerSample = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('utf8', 0);
  const footerSample = buffer.length > 512
    ? buffer.subarray(buffer.length - 512).toString('utf8', 0)
    : '';
  const sample = headerSample + ' ' + footerSample;

  const disallowedPatterns = [
    /<script[\s>]/i,
    /<\?xml/i,
    /<svg[\s>]/i,
    /<!doctype/i,
    /<html[\s>]/i,
    /<body[\s>]/i,
    /<iframe[\s>]/i,
    /javascript:/i,
    /onload\s*=/i,
    /onerror\s*=/i,
  ];

  return disallowedPatterns.some((pattern) => pattern.test(sample));
}

/**
 * Validate an uploaded image file buffer.
 *
 * @param {Buffer} buffer - In-memory file buffer from Multer.
 * @param {string} originalname - Original client-supplied filename.
 * @returns {{ valid: boolean, mime?: string, extension?: string, error?: string }}
 */
function validateImageBuffer(buffer, originalname = '') {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    return { valid: false, error: 'No image buffer provided.' };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'Uploaded file is empty.' };
  }

  if (buffer.length > MAX_IMAGE_SIZE) {
    return { valid: false, error: 'File exceeds maximum allowed size of 5 MB.' };
  }

  // Explicitly check for disallowed markup / script / SVG
  if (containsDisallowedMarkup(buffer)) {
    return { valid: false, error: 'Disallowed file content: HTML, XML, or SVG scripts detected.' };
  }

  // Detect binary magic bytes
  const detection = detectMagicBytes(buffer);

  if (!detection) {
    return {
      valid: false,
      error: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.',
    };
  }

  if (detection.malformed) {
    return {
      valid: false,
      error: `Malformed image data: ${detection.reason}`,
    };
  }

  const { format } = detection;

  // Validate filename extension match if originalname is provided
  if (originalname) {
    const rawExt = path.extname(originalname).toLowerCase();
    if (rawExt) {
      if (!format.allowedExtensions.includes(rawExt)) {
        return {
          valid: false,
          error: `File extension '${rawExt}' does not match detected image format (${format.mime}).`,
        };
      }
    }
  }

  return {
    valid: true,
    mime: format.mime,
    extension: format.extension,
  };
}

module.exports = {
  validateImageBuffer,
  detectMagicBytes,
  ALLOWED_FORMATS,
  MAX_IMAGE_SIZE,
};
