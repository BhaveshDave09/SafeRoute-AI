const { chatWithAgent } = require('../services/geminiService');

/**
 * Handle AI Safety Chat requests.
 * Expects body: { message: string, history: Array }
 */
async function chatWithSafetyAgent(req, res, next) {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required.',
      });
    }

    const result = await chatWithAgent(message, history || []);

    return res.status(200).json({
      success: true,
      reply: result.reply,
      history: result.updatedHistory,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  chatWithSafetyAgent,
};
