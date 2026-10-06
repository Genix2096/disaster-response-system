const dynamoService = require('../services/dynamoService');
const userService = require('../services/userService');
const logger = require('../utils/logger');

/**
 * GET /api/admin/users
 */
async function getAllUsers(req, res, next) {
  try {
    const users = await userService.getAllUsers();
    
    const enrichedUsers = users.map(user => {
      let riskLevel = 'NORMAL';
      if (user.riskScore >= 100) riskLevel = 'SUSPENDED';
      else if (user.riskScore >= 75) riskLevel = 'HIGH_RISK';
      else if (user.riskScore >= 50) riskLevel = 'WARNING';
      
      return { ...user, riskLevel };
    });
    
    res.json({ success: true, data: enrichedUsers, count: enrichedUsers.length });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/users/:id/suspend
 */
async function suspendUser(req, res, next) {
  try {
    const { id } = req.params;
    
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    const updated = await userService.updateUserStatus(id, userService.ACCOUNT_STATUS.SUSPENDED);
    logger.info('User manually suspended by admin', { userId: id, admin: req.admin?.username });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/users/:id/reactivate
 */
async function reactivateUser(req, res, next) {
  try {
    const { id } = req.params;
    
    const user = await userService.getUserById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    
    const updated = await userService.updateUserStatus(id, userService.ACCOUNT_STATUS.ACTIVE);
    logger.info('User reactivated by admin', { userId: id, admin: req.admin?.username });
    
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/admin/incidents/:id/fake
 */
async function markIncidentFake(req, res, next) {
  try {
    const { id } = req.params;
    const { fakeReason } = req.body;
    
    if (!fakeReason || fakeReason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'fakeReason is required.' });
    }
    
    if (fakeReason.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'fakeReason must be under 500 characters.' });
    }
    
    const adminUsername = req.admin?.username || 'admin';
    const now = new Date().toISOString();
    
    let updatedIncident;
    try {
      updatedIncident = await dynamoService.markIncidentFake(id, fakeReason.trim(), adminUsername, now);
    } catch (error) {
      if (error.message === 'Incident not found.') {
        return res.status(404).json({ success: false, message: error.message });
      }
      if (error.message === 'Incident is already marked as fake.') {
        return res.status(400).json({ success: false, message: 'This incident has already been marked as fake.' });
      }
      throw error;
    }
    
    // Increment reporting user's risk score and count
    const reportingUserId = updatedIncident.userId;
    if (reportingUserId) {
      await userService.incrementUserRisk(reportingUserId);
      logger.info('User risk score incremented due to fake incident', { userId: reportingUserId, incidentId: id });
    } else {
      logger.warn('Fake incident has no associated userId; skipping risk score update', { incidentId: id });
    }
    
    res.json({ success: true, data: updatedIncident });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAllUsers,
  suspendUser,
  reactivateUser,
  markIncidentFake,
};
