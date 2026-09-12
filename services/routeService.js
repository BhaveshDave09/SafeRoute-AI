const { supabase } = require('../config/supabase');
const { getAllIncidentsRaw } = require('./incidentService');
const { filterNearbyIncidents } = require('../utils/helpers');
const { analyzeRouteSafety: geminiAnalyze } = require('./geminiService');
const { findNearbyPlaces } = require('./safePlaceService');

// Weights
const HIGH_W   = parseInt(process.env.HIGH_SEVERITY_WEIGHT)   || 40;
const MEDIUM_W = parseInt(process.env.MEDIUM_SEVERITY_WEIGHT) || 20;
const LOW_W    = parseInt(process.env.LOW_SEVERITY_WEIGHT)    || 10;
const RADIUS   = parseFloat(process.env.NEARBY_RADIUS_KM)     || 2;
const HIGH_T   = parseInt(process.env.HIGH_RISK_THRESHOLD)    || 60;
const MEDIUM_T = parseInt(process.env.MEDIUM_RISK_THRESHOLD)  || 30;

// Time-aware multipliers
const NIGHT_MULT   = parseFloat(process.env.NIGHT_RISK_MULTIPLIER)   || 2.0;
const EVENING_MULT = parseFloat(process.env.EVENING_RISK_MULTIPLIER) || 1.4;
const DAY_MULT     = parseFloat(process.env.DAYTIME_RISK_MULTIPLIER) || 1.0;
const NIGHT_START  = parseInt(process.env.NIGHT_START_HOUR) || 22;
const NIGHT_END    = parseInt(process.env.NIGHT_END_HOUR)   || 5;

/**
 * Return the risk multiplier based on the current hour.
 */
function getTimeMultiplier(hour) {
  if (hour >= NIGHT_START || hour < NIGHT_END) return NIGHT_MULT;
  if (hour >= 18) return EVENING_MULT;
  return DAY_MULT;
}

/**
 * Return a human-readable time-of-day label.
 */
function getTimePeriod(hour) {
  if (hour >= NIGHT_START || hour < NIGHT_END) return 'night';
  if (hour >= 18) return 'evening';
  if (hour >= 12) return 'afternoon';
  return 'morning';
}

/**
 * Full route analysis engine:
 * - Haversine incident detection
 * - Time-aware risk scoring
 * - Gemini AI safety summary
 * - Nearby safe places
 */
async function analyzeRoute(startLocation, destination) {
  const now        = new Date();
  const hour       = now.getHours();
  const multiplier = getTimeMultiplier(hour);
  const timePeriod = getTimePeriod(hour);

  // 1. Fetch all incidents + nearby safe places in parallel
  const [allIncidents, safePlaces] = await Promise.all([
    getAllIncidentsRaw(),
    findNearbyPlaces(
      (startLocation.latitude + destination.latitude) / 2,
      (startLocation.longitude + destination.longitude) / 2,
      3000
    ),
  ]);

  // 2. Find nearby incidents (deduplicated)
  const nearStart = filterNearbyIncidents(allIncidents, startLocation.latitude, startLocation.longitude, RADIUS);
  const nearDest  = filterNearbyIncidents(allIncidents, destination.latitude, destination.longitude, RADIUS);
  const combined  = new Map();
  [...nearStart, ...nearDest].forEach((i) => combined.set(i.id, i));
  const nearbyIncidents = Array.from(combined.values());

  // 3. Time-aware weighted risk scoring
  const breakdown = { high: 0, medium: 0, low: 0 };
  let rawRisk = 0;

  nearbyIncidents.forEach((incident) => {
    const sev = incident.severity.toLowerCase();
    let baseWeight;
    if (sev === 'high') {
      baseWeight = HIGH_W;
      breakdown.high++;
    } else if (sev === 'medium') {
      baseWeight = MEDIUM_W;
      breakdown.medium++;
    } else {
      baseWeight = LOW_W;
      breakdown.low++;
    }
    rawRisk += baseWeight * multiplier;
  });

  const clampedRisk = Math.min(Math.round(rawRisk), 100);
  const safetyScore = Math.max(0, 100 - clampedRisk);

  const riskLevel =
    clampedRisk >= HIGH_T ? 'high' : clampedRisk >= MEDIUM_T ? 'medium' : 'low';

  // 4. Real Gemini AI summary
  const aiSummary = await geminiAnalyze({
    startLocation,
    destination,
    nearbyIncidents,
    safetyScore,
    riskLevel,
    hour,
    safePlaces: safePlaces.slice(0, 5),
  });

  // 5. Persist result
  const { data, error } = await supabase
    .from('route_analysis')
    .insert([{
      start_location: startLocation,
      destination,
      safety_score:   safetyScore,
      risk_level:     riskLevel,
      ai_summary:     aiSummary,
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to save route analysis: ${error.message}`);

  return {
    ...data,
    timePeriod,
    timeMultiplier: multiplier,
    incidentBreakdown: breakdown,
    nearbyIncidentCount: nearbyIncidents.length,
    safePlaces: safePlaces.slice(0, 5),
  };
}

module.exports = { analyzeRoute };
