const { supabase } = require('../config/supabase');

/**
 * Save an emergency contact for a user.
 */
async function saveEmergencyContact({ user_id, name, phone, email, relation }) {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .insert([{ user_id, name, phone: phone || null, email: email || null, relation: relation || 'other' }])
    .select()
    .single();

  if (error) throw new Error(`Failed to save contact: ${error.message}`);
  return data;
}

/**
 * Get all emergency contacts for a user.
 */
async function getEmergencyContacts(user_id) {
  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to get contacts: ${error.message}`);
  return data || [];
}

/**
 * Delete an emergency contact.
 */
async function deleteEmergencyContact(contactId, user_id) {
  const { error } = await supabase
    .from('emergency_contacts')
    .delete()
    .eq('id', contactId)
    .eq('user_id', user_id); // Ensures user can only delete their own contacts

  if (error) throw new Error(`Failed to delete contact: ${error.message}`);
  return true;
}

/**
 * Build an emergency alert payload for a given SOS log + contacts.
 * Returns a structured object — frontend/SMS API uses this to notify.
 *
 * @param {Object} sosLog     - The SOS log record
 * @param {Array}  contacts   - Emergency contact records
 * @param {string} urgency    - 'immediate' | 'high' | 'moderate'
 * @param {string} aiAdvice   - Gemini-generated advice for the user
 * @returns {Object}
 */
function buildAlertPayload(sosLog, contacts, urgency = 'high', aiAdvice = '') {
  const mapsLink = `https://www.google.com/maps?q=${sosLog.latitude},${sosLog.longitude}`;
  const time     = new Date(sosLog.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  return {
    sosLogId:  sosLog.id,
    urgency,
    triggeredAt: time,
    location: {
      latitude:  sosLog.latitude,
      longitude: sosLog.longitude,
      mapsLink,
    },
    userMessage: sosLog.user_message || 'No message provided.',
    aiAdvice,
    contacts: contacts.map((c) => ({
      name:     c.name,
      phone:    c.phone,
      email:    c.email,
      relation: c.relation,
      // Message template ready for SMS/email API
      smsMessage:
        `🚨 SAFEROUTE SOS ALERT\n` +
        `${c.name}, your contact triggered an SOS alert at ${time}.\n` +
        `Urgency: ${urgency.toUpperCase()}\n` +
        `Message: "${sosLog.user_message || 'No message'}"\n` +
        `Live Location: ${mapsLink}\n` +
        `Please check on them immediately or call emergency services.`,
      emailSubject: `🚨 SafeRoute SOS Alert — Action Required`,
    })),
  };
}

/**
 * Fetch contacts by a list of IDs (used by journey monitoring).
 */
async function getContactsByIds(contactIds) {
  if (!contactIds || contactIds.length === 0) return [];

  const { data, error } = await supabase
    .from('emergency_contacts')
    .select('*')
    .in('id', contactIds);

  if (error) throw new Error(`Failed to fetch contacts by IDs: ${error.message}`);
  return data || [];
}

module.exports = {
  saveEmergencyContact,
  getEmergencyContacts,
  deleteEmergencyContact,
  buildAlertPayload,
  getContactsByIds,
};
