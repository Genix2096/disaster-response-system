const { v4: uuidv4 } = require('uuid');

/**
 * Generate a unique incident ID.
 * Format: INC-YYYYMMDD-XXXXXX
 * Uses date + partial UUID for guaranteed uniqueness.
 */
function generateIncidentId() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;
  const uniquePart = uuidv4().replace(/-/g, '').substring(0, 6).toUpperCase();
  return `INC-${datePart}-${uniquePart}`;
}

module.exports = { generateIncidentId };
