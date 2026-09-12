const express = require('express');
const { body } = require('express-validator');
const { analyzeRouteSafety } = require('../controllers/routeController');
const { validate } = require('../middleware/validate');

const router = express.Router();

// Location object validator (reused for both start and destination)
const locationValidator = (field) => [
  body(`${field}.latitude`)
    .notEmpty().withMessage(`${field}.latitude is required.`)
    .isFloat({ min: -90, max: 90 })
    .withMessage(`${field}.latitude must be between -90 and 90.`),

  body(`${field}.longitude`)
    .notEmpty().withMessage(`${field}.longitude is required.`)
    .isFloat({ min: -180, max: 180 })
    .withMessage(`${field}.longitude must be between -180 and 180.`),

  body(`${field}.name`)
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage(`${field}.name must be a string under 200 characters.`)
    .trim(),
];

// Validation rules for POST /api/routes/analyze
const analyzeRouteRules = [
  body('startLocation')
    .notEmpty().withMessage('startLocation is required.')
    .isObject().withMessage('startLocation must be an object.'),
  body('destination')
    .notEmpty().withMessage('destination is required.')
    .isObject().withMessage('destination must be an object.'),

  ...locationValidator('startLocation'),
  ...locationValidator('destination'),
];

router.post('/analyze', analyzeRouteRules, validate, analyzeRouteSafety);

module.exports = router;
