/**
 * Haversine Formula
 * Calculates the great-circle distance between two geo-coordinates.
 * @param {number} lat1 - Latitude of point A
 * @param {number} lon1 - Longitude of point A
 * @param {number} lat2 - Latitude of point B
 * @param {number} lon2 - Longitude of point B
 * @returns {number} Distance in kilometers
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Filters incidents within a given radius from a coordinate point.
 * @param {Array} incidents - Array of incident objects with latitude/longitude
 * @param {number} centerLat - Center point latitude
 * @param {number} centerLon - Center point longitude
 * @param {number} radiusKm - Search radius in kilometers
 * @returns {Array} Nearby incidents
 */
function filterNearbyIncidents(incidents, centerLat, centerLon, radiusKm) {
  return incidents.filter((incident) => {
    const dist = haversineDistance(
      centerLat,
      centerLon,
      incident.latitude,
      incident.longitude
    );
    return dist <= radiusKm;
  });
}

/**
 * Generates an AI-style summary string describing the route risk.
 * @param {number} safetyScore - 0–100 safety score (lower = riskier)
 * @param {string} riskLevel - 'low' | 'medium' | 'high'
 * @param {number} nearbyCount - Total nearby incidents found
 * @param {Object} breakdown - { high, medium, low } incident counts by severity
 * @returns {string}
 */
function generateRouteSummary(safetyScore, riskLevel, nearbyCount, breakdown) {
  if (nearbyCount === 0) {
    return (
      `No incidents have been reported near this route. The route appears safe ` +
      `with a safety score of ${safetyScore}/100. Proceed with standard precautions.`
    );
  }

  const riskMessages = {
    low:
      `This route has a LOW risk level with a safety score of ${safetyScore}/100. ` +
      `${nearbyCount} minor incident(s) were detected nearby (${breakdown.high} high, ` +
      `${breakdown.medium} medium, ${breakdown.low} low severity). ` +
      `The route is generally safe — stay alert and proceed normally.`,

    medium:
      `This route has a MEDIUM risk level with a safety score of ${safetyScore}/100. ` +
      `${nearbyCount} incident(s) detected nearby (${breakdown.high} high, ` +
      `${breakdown.medium} medium, ${breakdown.low} low severity). ` +
      `Exercise caution — consider traveling in groups or during daylight hours.`,

    high:
      `⚠️ This route has a HIGH risk level with a safety score of ${safetyScore}/100. ` +
      `${nearbyCount} incident(s) detected nearby (${breakdown.high} high, ` +
      `${breakdown.medium} medium, ${breakdown.low} low severity). ` +
      `We strongly advise avoiding this route or taking additional safety measures such as ` +
      `sharing your live location and using well-lit, populated paths.`,
  };

  return riskMessages[riskLevel];
}

/**
 * Formats a success API response.
 */
function successResponse(res, data, statusCode = 200, message = 'Success') {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
}

/**
 * Formats an error API response.
 */
function errorResponse(res, message, statusCode = 500, errors = null) {
  const payload = { success: false, message };
  if (errors) payload.errors = errors;
  return res.status(statusCode).json(payload);
}

/**
 * Parses pagination query params with safe defaults.
 */
function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

module.exports = {
  haversineDistance,
  filterNearbyIncidents,
  generateRouteSummary,
  successResponse,
  errorResponse,
  parsePagination,
};
