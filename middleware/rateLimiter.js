const rateLimit = require('express-rate-limit');
const { errorResponse } = require('../utils/helpers');

/**
 * General API rate limiter.
 * Limits each IP to 100 requests per 15-minute window.
 */
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many requests from this IP. Please try again after 15 minutes.',
      429
    );
  },
});

/**
 * Strict limiter for SOS endpoints.
 * Allows 20 SOS requests per 15 minutes per IP.
 */
const sosLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    return errorResponse(
      res,
      'Too many SOS requests. If this is a genuine emergency, please call local emergency services.',
      429
    );
  },
});

module.exports = { apiLimiter, sosLimiter };
