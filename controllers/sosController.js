const { createSosLog, getAllSosLogs } = require('../services/sosService');
const { successResponse, parsePagination } = require('../utils/helpers');

/**
 * POST /api/sos
 * Log an SOS emergency alert.
 *
 * Expected body:
 * {
 *   "latitude":     28.6139,
 *   "longitude":    77.2090,
 *   "user_message": "I feel unsafe near the market"
 * }
 */
async function triggerSos(req, res, next) {
  try {
    const sosLog = await createSosLog(req.body);
    return successResponse(
      res,
      {
        id:          sosLog.id,
        latitude:    sosLog.latitude,
        longitude:   sosLog.longitude,
        userMessage: sosLog.user_message,
        createdAt:   sosLog.created_at,
      },
      201,
      '🚨 SOS alert received and logged. Stay safe!'
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/sos
 * Retrieve all SOS alerts (paginated).
 */
async function listSosLogs(req, res, next) {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { sosLogs, total } = await getAllSosLogs({ limit, offset });

    return successResponse(res, {
      sosLogs,
      pagination: {
        total,
        page,
        limit,
        totalPages:  Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { triggerSos, listSosLogs };
