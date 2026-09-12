const { getDashboardStats } = require('../services/statsService');
const { successResponse } = require('../utils/helpers');

/**
 * GET /api/stats
 * Returns aggregated dashboard statistics.
 *
 * Response:
 * {
 *   totalIncidents,
 *   highRiskAreas,
 *   mediumRiskAreas,
 *   lowRiskAreas,
 *   totalSosAlerts,
 *   totalRouteAnalyses,
 *   recentReports: [...]
 * }
 */
async function getStats(req, res, next) {
  try {
    const stats = await getDashboardStats();
    return successResponse(res, stats, 200, 'Dashboard statistics retrieved.');
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };
