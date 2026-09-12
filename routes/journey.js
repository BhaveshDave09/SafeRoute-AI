const express = require('express');
const { body, param } = require('express-validator');
const { startJourney, checkIn, getJourney } = require('../controllers/journeyController');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Shared location validator helper
const locationRules = (field) => [
  body(`${field}.latitude`)
    .notEmpty().withMessage(`${field}.latitude is required.`)
    .isFloat({ min: -90, max: 90 }).withMessage(`${field}.latitude must be a number between -90 and 90.`),
  body(`${field}.longitude`)
    .notEmpty().withMessage(`${field}.longitude is required.`)
    .isFloat({ min: -180, max: 180 }).withMessage(`${field}.longitude must be a number between -180 and 180.`),
  body(`${field}.name`)
    .optional()
    .isString().withMessage(`${field}.name must be a string.`)
    .trim(),
];

const startJourneyRules = [
  body('user_name')
    .optional()
    .isString().withMessage('user_name must be a string.')
    .trim(),
  body('eta_minutes')
    .notEmpty().withMessage('eta_minutes is required.')
    .isInt({ min: 1, max: 1440 }).withMessage('eta_minutes must be between 1 and 1440 minutes (24 hours).'),
  body('emergency_contact_ids')
    .optional()
    .isArray().withMessage('emergency_contact_ids must be an array of strings/numbers.'),
  ...locationRules('start_location'),
  ...locationRules('destination'),
];

const idParamRules = [
  param('id')
    .notEmpty().withMessage('Journey ID is required.')
];

// Routes
router.post('/start', startJourneyRules, validate, startJourney);
router.post('/:id/checkin', idParamRules, validate, checkIn);
router.get('/:id', idParamRules, validate, getJourney);

module.exports = router;
