const { findNearbyPlaces } = require('../services/safePlaceService');

/**
 * Handle GET /api/safe-places requests.
 * Expects query params: latitude, longitude, radius (optional, in meters)
 */
async function getNearbySafePlaces(req, res, next) {
  try {
    const { latitude, longitude, radius } = req.query;

    const lat = parseFloat(latitude);
    const lon = parseFloat(longitude);
    const rad = radius ? parseInt(radius) : undefined;

    const places = await findNearbyPlaces(lat, lon, rad);

    return res.status(200).json({
      success: true,
      places,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getNearbySafePlaces,
};
