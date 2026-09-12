const { getChatModel, getAnalysisModel } = require('../config/gemini');

const GEMINI_ENABLED = !!process.env.GEMINI_API_KEY;

// ─── Fallback messages when Gemini is not configured ──────────────────────────
const FALLBACK_SUMMARIES = {
  high:   '⚠️ HIGH RISK: Multiple serious incidents reported near this route. Strongly advise avoiding this route, especially after dark. Share your location with someone trusted.',
  medium: '⚡ MEDIUM RISK: Some incidents reported near this route. Stay alert, stick to busy roads, and avoid isolated areas.',
  low:    '✅ LOW RISK: This route appears relatively safe based on recent reports. Maintain standard safety precautions.',
};

/**
 * Generate a real AI-powered route safety analysis using Gemini.
 *
 * @param {Object} params
 * @param {Object} params.startLocation   - { name, latitude, longitude }
 * @param {Object} params.destination     - { name, latitude, longitude }
 * @param {Array}  params.nearbyIncidents - Incident objects near the route
 * @param {number} params.safetyScore     - Computed safety score 0–100
 * @param {string} params.riskLevel       - 'low' | 'medium' | 'high'
 * @param {number} params.hour            - Current hour (0–23)
 * @param {Array}  params.safePlaces      - Nearby safe places
 * @returns {string} AI-generated safety analysis
 */
async function analyzeRouteSafety({
  startLocation,
  destination,
  nearbyIncidents,
  safetyScore,
  riskLevel,
  hour,
  safePlaces = [],
}) {
  if (!GEMINI_ENABLED) return FALLBACK_SUMMARIES[riskLevel];

  try {
    const model = getAnalysisModel();

    const incidentSummary =
      nearbyIncidents.length === 0
        ? 'No incidents reported near this route.'
        : nearbyIncidents
            .slice(0, 10) // Limit context to 10 most recent
            .map(
              (i) =>
                `- ${i.incident_type} (${i.severity} severity)${i.description ? ': ' + i.description : ''}`
            )
            .join('\n');

    const safePlacesSummary =
      safePlaces.length === 0
        ? 'No safe places data available.'
        : safePlaces
            .slice(0, 5)
            .map((p) => `- ${p.type}: ${p.name || 'Unnamed'} (${p.distanceMeters}m away)`)
            .join('\n');

    const timeContext =
      hour >= 22 || hour < 5
        ? 'late night (high risk period)'
        : hour >= 18
        ? 'evening'
        : hour >= 6
        ? 'daytime (safer period)'
        : 'early morning';

    const prompt = `
Analyze this route for women's safety and provide a concise, actionable safety advisory.

Route: From "${startLocation.name || `${startLocation.latitude},${startLocation.longitude}`}" 
       to "${destination.name || `${destination.latitude},${destination.longitude}`}"

Safety Score: ${safetyScore}/100 (${riskLevel.toUpperCase()} risk)
Time of Day: ${timeContext} (${hour}:00)

Recent Incidents Nearby:
${incidentSummary}

Nearby Safe Places:
${safePlacesSummary}

Provide a 3–4 sentence safety advisory that:
1. States the overall risk level and why
2. Mentions 2–3 specific safety tips relevant to these incident types and time
3. Mentions nearest safe place if available
4. Ends with one empowering, positive safety reminder

Keep it under 150 words. Be direct and practical.
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return text.trim();
  } catch (err) {
    console.error('[GeminiService] analyzeRouteSafety error:', err.message);
    return FALLBACK_SUMMARIES[riskLevel];
  }
}

/**
 * Use Gemini to classify and validate an incident report.
 * Returns { validatedType, validatedSeverity, tags, isLikelyValid }
 *
 * @param {string} description  - User's incident description
 * @param {string} incidentType - User-provided type
 * @param {string} severity     - User-provided severity
 * @returns {Object}
 */
async function classifyIncident(description, incidentType, severity) {
  if (!GEMINI_ENABLED || !description) {
    return { validatedType: incidentType, validatedSeverity: severity, tags: [], isLikelyValid: true, aiNote: null };
  }

  try {
    const model = getAnalysisModel();

    const prompt = `
You are a safety incident classifier for a women's safety app.
Analyze this incident report and respond ONLY with valid JSON.

User reported incident type: "${incidentType}"
User reported severity: "${severity}"
Description: "${description}"

Respond with this exact JSON structure:
{
  "validatedType": "most accurate incident type from description",
  "validatedSeverity": "low|medium|high based on description",
  "tags": ["tag1", "tag2"],
  "isLikelyValid": true or false (false if description seems fake/spam/unrelated to safety),
  "aiNote": "one sentence note if severity or type was adjusted, else null"
}

Tags should be relevant keywords like: nighttime, isolated_area, public_transport, physical_threat, verbal_abuse, stalking, theft, lighting_issue, etc.
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      validatedType:     parsed.validatedType     || incidentType,
      validatedSeverity: parsed.validatedSeverity || severity,
      tags:              Array.isArray(parsed.tags) ? parsed.tags : [],
      isLikelyValid:     parsed.isLikelyValid !== false,
      aiNote:            parsed.aiNote || null,
    };
  } catch (err) {
    console.error('[GeminiService] classifyIncident error:', err.message);
    return { validatedType: incidentType, validatedSeverity: severity, tags: [], isLikelyValid: true, aiNote: null };
  }
}

/**
 * Generate a location safety briefing — area summary for the past 7 days.
 *
 * @param {string} locationName
 * @param {Array}  recentIncidents
 * @returns {string}
 */
async function generateAreaBriefing(locationName, recentIncidents) {
  if (!GEMINI_ENABLED) {
    return `Safety briefing for ${locationName}: ${recentIncidents.length} incident(s) reported in the past 7 days.`;
  }

  try {
    const model = getAnalysisModel();

    const incidentList =
      recentIncidents.length === 0
        ? 'No incidents reported in the last 7 days.'
        : recentIncidents
            .map((i) => `- ${i.incident_type} (${i.severity}) — ${new Date(i.created_at).toLocaleDateString()}`)
            .join('\n');

    const prompt = `
Create a brief safety briefing for women traveling to or through "${locationName}".

Incidents reported in the last 7 days:
${incidentList}

Write 2–3 sentences:
1. Summarize the safety situation
2. Note peak risk times if identifiable
3. Give one practical safety recommendation

Keep it under 80 words. Be empathetic and empowering.
`.trim();

    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error('[GeminiService] generateAreaBriefing error:', err.message);
    return `${recentIncidents.length} incident(s) reported near ${locationName} in the past 7 days. Stay alert and travel with others when possible.`;
  }
}

/**
 * Generate an urgency assessment for an SOS alert.
 *
 * @param {string} message - User's SOS message
 * @returns {{ urgency: string, advice: string }}
 */
async function assessSosUrgency(message) {
  if (!GEMINI_ENABLED || !message) {
    return { urgency: 'unknown', advice: 'Emergency services have been alerted. Stay in a safe location.' };
  }

  try {
    const model = getAnalysisModel();

    const prompt = `
A woman has triggered an SOS alert with this message: "${message}"

Classify urgency and respond ONLY with JSON:
{
  "urgency": "immediate|high|moderate",
  "advice": "one actionable safety instruction for the user right now"
}

"immediate" = physical danger or assault in progress
"high" = being followed, threatened, or very afraid
"moderate" = feeling unsafe, precautionary
`.trim();

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      urgency: ['immediate', 'high', 'moderate'].includes(parsed.urgency) ? parsed.urgency : 'high',
      advice:  parsed.advice || 'Move to the nearest safe public place immediately.',
    };
  } catch (err) {
    console.error('[GeminiService] assessSosUrgency error:', err.message);
    return { urgency: 'high', advice: 'Move to the nearest safe, populated area. Help is on the way.' };
  }
}

/**
 * Start a multi-turn safety chat session.
 * Returns a Gemini ChatSession object.
 */
function startChatSession(history = []) {
  const model = getChatModel();
  return model.startChat({
    history: history.map((msg) => ({
      role:  msg.role,
      parts: [{ text: msg.content }],
    })),
  });
}

/**
 * Send a single message to the safety chat agent.
 *
 * @param {string} userMessage
 * @param {Array}  history - [{ role: 'user'|'model', content: string }]
 * @returns {{ reply: string, updatedHistory: Array }}
 */
async function chatWithAgent(userMessage, history = []) {
  if (!GEMINI_ENABLED) {
    return {
      reply: "I'm SafeRoute AI. I'm not fully configured yet, but I'm here to help with your safety. Please call emergency services (100) if you're in immediate danger.",
      updatedHistory: history,
    };
  }

  try {
    const session = startChatSession(history);
    const result  = await session.sendMessage(userMessage);
    const reply   = result.response.text().trim();

    const updatedHistory = [
      ...history,
      { role: 'user',  content: userMessage },
      { role: 'model', content: reply },
    ];

    return { reply, updatedHistory };
  } catch (err) {
    console.error('[GeminiService] chatWithAgent error:', err.message);
    return {
      reply: "I'm having trouble connecting right now. If you're in danger, please call 100 (Police) or 112 (Emergency) immediately.",
      updatedHistory: history,
    };
  }
}

module.exports = {
  analyzeRouteSafety,
  classifyIncident,
  generateAreaBriefing,
  assessSosUrgency,
  chatWithAgent,
  GEMINI_ENABLED,
};
