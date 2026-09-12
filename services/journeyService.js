const { supabase } = require('../config/supabase');
const cron = require('node-cron');
const { assessSosUrgency } = require('./geminiService');
const { createSosLog } = require('./sosService');

const GRACE_MINUTES = parseInt(process.env.JOURNEY_GRACE_PERIOD_MINUTES) || 10;

// In-memory map of scheduled dead-man's-switch jobs: journeyId → cron task
const scheduledJobs = new Map();

// ─── DB Operations ─────────────────────────────────────────────────────────────

/**
 * Create a new monitored journey in the database.
 */
async function createJourney({ user_name, start_location, destination, eta_minutes, emergency_contact_ids }) {
  const eta_at = new Date(Date.now() + eta_minutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('journeys')
    .insert([{
      user_name:             user_name || 'Anonymous',
      start_location,
      destination,
      eta_minutes,
      eta_at,
      emergency_contact_ids: emergency_contact_ids || [],
      status:                'active',
    }])
    .select()
    .single();

  if (error) throw new Error(`Failed to start journey: ${error.message}`);
  return data;
}

/**
 * Retrieve a journey by ID.
 */
async function getJourneyById(journeyId) {
  const { data, error } = await supabase
    .from('journeys')
    .select('*')
    .eq('id', journeyId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to retrieve journey: ${error.message}`);
  }
  return data;
}

/**
 * Mark a journey as checked-in (safe).
 */
async function checkInJourney(journeyId) {
  const { data, error } = await supabase
    .from('journeys')
    .update({ status: 'completed', checked_in_at: new Date().toISOString() })
    .eq('id', journeyId)
    .eq('status', 'active')
    .select()
    .single();

  if (error) throw new Error(`Failed to check in: ${error.message}`);

  // Cancel scheduled dead-man's switch
  cancelDeadSwitch(journeyId);
  return data;
}

/**
 * Mark a journey as SOS-triggered.
 */
async function markJourneyAsSos(journeyId) {
  const { data, error } = await supabase
    .from('journeys')
    .update({ status: 'sos_triggered' })
    .eq('id', journeyId)
    .select()
    .single();

  if (error) console.error('[JourneyService] markJourneyAsSos error:', error.message);
  return data;
}

// ─── Dead Man's Switch ─────────────────────────────────────────────────────────

/**
 * Schedule a dead-man's switch for a journey.
 * Fires (ETA + grace period) minutes from now.
 * If user hasn't checked in, auto-creates an SOS log.
 *
 * @param {Object} journey - Journey record from DB
 */
function scheduleDeadSwitch(journey) {
  const fireAt = new Date(journey.eta_at).getTime() + GRACE_MINUTES * 60 * 1000;
  const delay  = fireAt - Date.now();

  if (delay <= 0) return; // Already past ETA — fire immediately

  console.log(`[DeadSwitch] Scheduled for journey ${journey.id} in ${Math.round(delay / 60000)} min`);

  const timeout = setTimeout(async () => {
    try {
      // Re-fetch journey to check current status
      const current = await getJourneyById(journey.id);
      if (!current || current.status !== 'active') {
        console.log(`[DeadSwitch] Journey ${journey.id} already resolved (${current?.status}). Skipping.`);
        return;
      }

      console.log(`[DeadSwitch] 🚨 No check-in for journey ${journey.id} — triggering auto-SOS`);

      // Auto-create SOS log from journey's destination coords
      const destCoords = current.destination;
      await createSosLog({
        latitude:     destCoords.latitude,
        longitude:    destCoords.longitude,
        user_message: `⚠️ AUTO-SOS: ${current.user_name} started a monitored journey but did not check in by their ETA (${current.eta_minutes} min). Last known route: "${current.start_location?.name || 'Unknown'}" → "${current.destination?.name || 'Unknown'}".`,
      });

      await markJourneyAsSos(journey.id);
      scheduledJobs.delete(journey.id);

      console.log(`[DeadSwitch] Auto-SOS created for journey ${journey.id}`);
    } catch (err) {
      console.error('[DeadSwitch] Error firing dead switch:', err.message);
    }
  }, delay);

  scheduledJobs.set(journey.id, timeout);
}

/**
 * Cancel a scheduled dead-man's switch.
 */
function cancelDeadSwitch(journeyId) {
  const job = scheduledJobs.get(journeyId);
  if (job) {
    clearTimeout(job);
    scheduledJobs.delete(journeyId);
    console.log(`[DeadSwitch] Cancelled for journey ${journeyId}`);
  }
}

/**
 * Start a journey: persist to DB + schedule dead-man's switch.
 */
async function startJourney(journeyData) {
  const journey = await createJourney(journeyData);
  scheduleDeadSwitch(journey);
  return journey;
}

module.exports = {
  startJourney,
  getJourneyById,
  checkInJourney,
  markJourneyAsSos,
  scheduleDeadSwitch,
  cancelDeadSwitch,
};
