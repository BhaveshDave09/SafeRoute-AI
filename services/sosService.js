const { supabase } = require('../config/supabase');

/**
 * Save an SOS alert to the database.
 * @param {Object} sosData - { latitude, longitude, user_message }
 * @returns {Object} Created SOS log
 */
async function createSosLog(sosData) {
  const { latitude, longitude, user_message } = sosData;

  const { data, error } = await supabase
    .from('sos_logs')
    .insert([
      {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        user_message: user_message ? user_message.trim() : null,
      },
    ])
    .select()
    .single();

  if (error) {
    console.error('[SosService] createSosLog error:', error);
    throw new Error(`Failed to log SOS alert: ${error.message}`);
  }

  return data;
}

/**
 * Retrieve all SOS logs ordered by most recent first.
 * @param {Object} options - { limit, offset }
 * @returns {{ sosLogs: Array, total: number }}
 */
async function getAllSosLogs({ limit, offset }) {
  const { data, error, count } = await supabase
    .from('sos_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[SosService] getAllSosLogs error:', error);
    throw new Error(`Failed to retrieve SOS logs: ${error.message}`);
  }

  return { sosLogs: data, total: count };
}

module.exports = { createSosLog, getAllSosLogs };
