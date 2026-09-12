const express = require('express');
const { query } = require('express-validator');
const { getNearbySafePlaces } = require('../controllers/safePlaceController');
const { validate } = require('../middleware/validate');

const router = express.Router();

const safePlaceRules = [
  query('latitude')
    .notEmpty()
    .withMessage('Latitude query parameter is required.')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid float between -90 and 90.'),
  query('longitude')
    .notEmpty()
    .withMessage('Longitude query parameter is required.')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid float between -180 and 180.'),
  query('radius')
    .optional()
    .isInt({ min: 100, max: 10000 })
    .withMessage('Radius must be an integer between 100 and 10000 meters.'),
];

router.get('/', safePlaceRules, validate, getNearbySafePlaces);

module.exports = router;
