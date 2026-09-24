/**
 * Determine incident priority based on type.
 * Simple deterministic rules — no AI involved.
 */
const PRIORITY_MAP = {
  'Fire': 'HIGH',
  'Flood': 'HIGH',
  'Accident': 'MEDIUM',
  'Building Damage': 'MEDIUM',
  'Road Damage': 'LOW',
  'Other': 'LOW',
};

function determinePriority(incidentType) {
  return PRIORITY_MAP[incidentType] || 'LOW';
}

module.exports = { determinePriority, PRIORITY_MAP };
