const { analyzeRoute } = require('../services/routeService');
const { successResponse } = require('../utils/helpers');

/**
 * POST /api/routes/analyze
 * Analyze safety of a route between two locations.
 *
 * Expected body:
 * {
 *   "startLocation": { "name": "Connaught Place", "latitude": 28.6315, "longitude": 77.2167 },
 *   "destination":   { "name": "India Gate",      "latitude": 28.6129, "longitude": 77.2295 }
 * }
 */
async function analyzeRouteSafety(req, res, next) {
  try {
    const { startLocation, destination } = req.body;

    const result = await analyzeRoute(startLocation, destination);

    return successResponse(
      res,
      {
        id:            result.id,
        startLocation: result.start_location,
        destination:   result.destination,
        safetyScore:   result.safety_score,
        riskLevel:     result.risk_level,
        aiSummary:     result.ai_summary,
        analyzedAt:    result.created_at,
      },
      200,
      'Route analysis completed.'
    );
  } catch (err) {
    next(err);
  }
}

module.exports = { analyzeRouteSafety };
