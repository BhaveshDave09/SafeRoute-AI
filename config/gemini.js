const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const geminiApiKey = process.env.GEMINI_API_KEY;
if (!geminiApiKey) {
  console.warn('[Gemini] WARNING: GEMINI_API_KEY not set. AI features will be disabled.');
}

const genAI = new GoogleGenerativeAI(geminiApiKey);

// ─── Safety settings — keep relaxed so safety reports aren't blocked ──────────
const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
];

// ─── System instruction for the Women's Safety Agent ─────────────────────────
const SAFETY_AGENT_SYSTEM_INSTRUCTION = `
You are SafeRoute AI — an empathetic, highly knowledgeable women's safety advisor.
Your purpose is to help women navigate cities safely, assess risks, and make informed decisions.

Guidelines:
- Always be empathetic, calm, and non-judgmental.
- Provide practical, actionable safety advice tailored to women.
- When assessing routes or areas, consider time of day, incident history, and local context.
- Suggest safe alternatives when a route/area is risky.
- Always remind users that in immediate danger, they should call local emergency services (100 in India, 911 in USA).
- Be concise but thorough. Use bullet points for actionable advice.
- Never minimize a safety concern — take every question seriously.
- You are aware of common threats: stalking, harassment, poorly lit areas, isolated routes, theft.
- When suggesting safe places, mention police stations, hospitals, busy public areas, metro stations.
`.trim();

/**
 * Get the generative model with safety agent system instruction.
 */
function getChatModel() {
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    systemInstruction: SAFETY_AGENT_SYSTEM_INSTRUCTION,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 1024,
    },
  });
}

/**
 * Get the generative model for structured analysis tasks (lower temperature).
 */
function getAnalysisModel() {
  return genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    systemInstruction: SAFETY_AGENT_SYSTEM_INSTRUCTION,
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      temperature: 0.3,
      topP: 0.8,
      maxOutputTokens: 2048,
    },
  });
}

module.exports = { genAI, getChatModel, getAnalysisModel, SAFETY_AGENT_SYSTEM_INSTRUCTION };
