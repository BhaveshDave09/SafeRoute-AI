const express = require('express');
const { body, param } = require('express-validator');
const { reportIncident, listIncidents, getIncident } = require('../controllers/incidentController');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Allowed incident types for validation
const VALID_INCIDENT_TYPES = [
  'theft', 'harassment', 'assault', 'vandalism', 'poor lighting',
  'suspicious activity', 'road accident', 'flooding', 'fire',
  'medical emergency', 'robbery', 'stalking', 'other',
];

// Validation rules for POST /api/incidents
const reportIncidentRules = [
  body('latitude')
    .notEmpty().withMessage('Latitude is required.')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid number between -90 and 90.'),

  body('longitude')
    .notEmpty().withMessage('Longitude is required.')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid number between -180 and 180.'),

  body('incident_type')
    .notEmpty().withMessage('Incident type is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Incident type must be between 2 and 100 characters.')
    .trim(),

  body('severity')
    .notEmpty().withMessage('Severity is required.')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Severity must be one of: low, medium, high.'),

  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters.')
    .trim(),
];

// Validation rule for GET /api/incidents/:id
const getIncidentRules = [
  param('id')
    .isUUID()
    .withMessage('Incident ID must be a valid UUID.'),
];

// Routes
router.post('/',    reportIncidentRules, validate, reportIncident);
router.get('/',     listIncidents);
router.get('/:id',  getIncidentRules, validate, getIncident);

module.exports = router;
