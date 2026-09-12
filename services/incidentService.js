const { supabase } = require('../config/supabase');
const { classifyIncident } = require('./geminiService');

async function createIncident(incidentData) {
  const { latitude, longitude, incident_type, severity, description } = incidentData;

  // AI classification — validates + enriches the report
  const aiClassification = await classifyIncident(description, incident_type, severity);

  const { data, error } = await supabase
    .from('incidents')
    .insert([{
      latitude:      parseFloat(latitude),
      longitude:     parseFloat(longitude),
      incident_type: aiClassification.validatedType || incident_type.trim(),
      severity:      aiClassification.validatedSeverity || severity.toLowerCase(),
      description:   description ? description.trim() : null,
      ai_tags:       aiClassification.tags || [],
      ai_validated:  aiClassification.isLikelyValid,
      ai_note:       aiClassification.aiNote || null,
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to create incident: ${error.message}`);
  return { ...data, aiClassification };
}

async function getAllIncidents({ severity, incident_type, limit, offset }) {
  let query = supabase
    .from('incidents')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (severity)       query = query.eq('severity', severity.toLowerCase());
  if (incident_type)  query = query.ilike('incident_type', `%${incident_type}%`);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to retrieve incidents: ${error.message}`);
  return { incidents: data, total: count };
}

async function getIncidentById(id) {
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to retrieve incident: ${error.message}`);
  }
  return data;
}

async function getAllIncidentsRaw() {
  const { data, error } = await supabase
    .from('incidents')
    .select('id, latitude, longitude, incident_type, severity, created_at');

  if (error) throw new Error(`Failed to retrieve incidents: ${error.message}`);
  return data || [];
}

/**
 * Get incidents from the last N days near a location (for area briefings).
 */
async function getRecentIncidentsNear(latitude, longitude, radiusKm = 2, days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('incidents')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Failed to retrieve recent incidents: ${error.message}`);

  const { filterNearbyIncidents } = require('../utils/helpers');
  return filterNearbyIncidents(data || [], latitude, longitude, radiusKm);
}

module.exports = {
  createIncident,
  getAllIncidents,
  getIncidentById,
  getAllIncidentsRaw,
  getRecentIncidentsNear,
};
