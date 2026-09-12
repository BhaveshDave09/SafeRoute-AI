const { supabase } = require('../config/supabase');

/**
 * Aggregate dashboard statistics from all three tables.
 * Returns totalIncidents, highRiskAreas, lowRiskAreas, and recentReports.
 */
async function getDashboardStats() {
  // Run all queries in parallel for efficiency
  const [
    incidentsResult,
    highRiskResult,
    lowRiskResult,
    recentResult,
    sosResult,
    routeResult,
  ] = await Promise.all([
    // Total incident count
    supabase
      .from('incidents')
      .select('id', { count: 'exact', head: true }),

    // High-severity incident count → "high risk areas"
    supabase
      .from('incidents')
      .select('id', { count: 'exact', head: true })
      .eq('severity', 'high'),

    // Low-severity incident count → "low risk areas"
    supabase
      .from('incidents')
      .select('id', { count: 'exact', head: true })
      .eq('severity', 'low'),

    // Last 5 incidents for "recent reports"
    supabase
      .from('incidents')
      .select('id, incident_type, severity, latitude, longitude, created_at')
      .order('created_at', { ascending: false })
      .limit(5),

    // Total SOS alerts
    supabase
      .from('sos_logs')
      .select('id', { count: 'exact', head: true }),

    // Total route analyses
    supabase
      .from('route_analysis')
      .select('id', { count: 'exact', head: true }),
  ]);

  // Check for any query errors
  const errors = [
    incidentsResult,
    highRiskResult,
    lowRiskResult,
    recentResult,
    sosResult,
    routeResult,
  ].filter((r) => r.error);

  if (errors.length > 0) {
    console.error('[StatsService] Query errors:', errors.map((e) => e.error));
    throw new Error('Failed to retrieve dashboard statistics.');
  }

  return {
    totalIncidents:    incidentsResult.count || 0,
    highRiskAreas:     highRiskResult.count  || 0,
    mediumRiskAreas:
      (incidentsResult.count || 0) -
      (highRiskResult.count  || 0) -
      (lowRiskResult.count   || 0),
    lowRiskAreas:      lowRiskResult.count   || 0,
    totalSosAlerts:    sosResult.count        || 0,
    totalRouteAnalyses: routeResult.count     || 0,
    recentReports:     recentResult.data      || [],
  };
}

module.exports = { getDashboardStats };
