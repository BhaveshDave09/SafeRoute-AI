const express = require('express');
const { body } = require('express-validator');
const { triggerSos, listSosLogs } = require('../controllers/sosController');
const { validate } = require('../middleware/validate');
const { sosLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Validation rules for POST /api/sos
const triggerSosRules = [
  body('latitude')
    .notEmpty().withMessage('Latitude is required.')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid number between -90 and 90.'),

  body('longitude')
    .notEmpty().withMessage('Longitude is required.')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid number between -180 and 180.'),

  body('user_message')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Message must not exceed 500 characters.')
    .trim(),
];

// SOS trigger — applies stricter rate limiter
router.post('/', sosLimiter, triggerSosRules, validate, triggerSos);

// List SOS logs (admin/dashboard use)
router.get('/', listSosLogs);

module.exports = router;
