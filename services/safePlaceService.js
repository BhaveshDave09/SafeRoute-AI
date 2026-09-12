const axios = require('axios');

const OVERPASS_URL =
  process.env.OVERPASS_API_URL || 'https://overpass-api.de/api/interpreter';
const DEFAULT_RADIUS = parseInt(process.env.SAFE_PLACES_RADIUS_METERS) || 2000;

// OSM amenity types mapped to friendly labels
const SAFE_AMENITY_TYPES = {
  police:       { label: 'Police Station', priority: 1 },
  hospital:     { label: 'Hospital',       priority: 2 },
  clinic:       { label: 'Clinic',         priority: 3 },
  fire_station: { label: 'Fire Station',   priority: 4 },
  pharmacy:     { label: 'Pharmacy',       priority: 5 },
  bank:         { label: 'Bank / ATM',     priority: 6 },
  subway_entrance: { label: 'Metro Station', priority: 7 },
  bus_station:  { label: 'Bus Station',    priority: 8 },
  convenience:  { label: 'Convenience Store (24h)', priority: 9 },
  cafe:         { label: 'Café',           priority: 10 },
};

/**
 * Calculate distance in meters between two coordinates.
 */
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/**
 * Query OpenStreetMap Overpass API for safe places near a coordinate.
 *
 * @param {number} latitude
 * @param {number} longitude
 * @param {number} radiusMeters
 * @returns {Array} Sorted list of safe places
 */
async function findNearbyPlaces(latitude, longitude, radiusMeters = DEFAULT_RADIUS) {
  const amenities = Object.keys(SAFE_AMENITY_TYPES).join('|');

  // Overpass QL query — finds nodes + ways with these amenity tags
  const query = `
[out:json][timeout:15];
(
  node["amenity"~"${amenities}"](around:${radiusMeters},${latitude},${longitude});
  way["amenity"~"${amenities}"](around:${radiusMeters},${latitude},${longitude});
  node["shop"="convenience"](around:${radiusMeters},${latitude},${longitude});
  node["railway"="subway_entrance"](around:${radiusMeters},${latitude},${longitude});
  node["highway"="bus_stop"](around:${radiusMeters},${latitude},${longitude});
);
out center 30;
`.trim();

  try {
    const response = await axios.post(OVERPASS_URL, `data=${encodeURIComponent(query)}`, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 18000,
    });

    const elements = response.data?.elements || [];

    const places = elements
      .map((el) => {
        const lat = el.lat || el.center?.lat;
        const lon = el.lon || el.center?.lon;
        if (!lat || !lon) return null;

        const amenity =
          el.tags?.amenity ||
          (el.tags?.shop === 'convenience' ? 'convenience' : null) ||
          (el.tags?.railway === 'subway_entrance' ? 'subway_entrance' : null) ||
          (el.tags?.highway === 'bus_stop' ? 'bus_station' : null);

        const meta = SAFE_AMENITY_TYPES[amenity];
        if (!meta) return null;

        const dist = distanceMeters(latitude, longitude, lat, lon);

        return {
          id:             el.id,
          type:           meta.label,
          amenity,
          name:           el.tags?.name || el.tags?.['name:en'] || null,
          latitude:       lat,
          longitude:      lon,
          distanceMeters: dist,
          priority:       meta.priority,
          phone:          el.tags?.phone || el.tags?.['contact:phone'] || null,
          openingHours:   el.tags?.opening_hours || null,
          address:
            [el.tags?.['addr:housenumber'], el.tags?.['addr:street'], el.tags?.['addr:city']]
              .filter(Boolean)
              .join(', ') || null,
        };
      })
      .filter(Boolean)
      // Sort by priority first, then distance
      .sort((a, b) => a.priority - b.priority || a.distanceMeters - b.distanceMeters);

    // Return top 20 places, deduplicated by name+type
    const seen = new Set();
    return places
      .filter((p) => {
        const key = `${p.type}-${p.name || p.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 20);
  } catch (err) {
    console.error('[SafePlaceService] Overpass query error:', err.message);
    // Return empty array gracefully — don't crash the route analysis
    return [];
  }
}

/**
 * Get only the highest-priority safe place for embedding in route analysis.
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Object|null}
 */
async function getNearestSafePlace(latitude, longitude) {
  const places = await findNearbyPlaces(latitude, longitude, 3000);
  return places.length > 0 ? places[0] : null;
}

module.exports = { findNearbyPlaces, getNearestSafePlace };
