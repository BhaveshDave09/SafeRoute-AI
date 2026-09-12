const express = require('express');
const { body } = require('express-validator');
const { chatWithSafetyAgent } = require('../controllers/chatController');
const { validate } = require('../middleware/validate');

const router = express.Router();

const chatRules = [
  body('message')
    .notEmpty()
    .withMessage('Message is required.')
    .isString()
    .withMessage('Message must be a string.')
    .trim(),
  body('history')
    .optional()
    .isArray()
    .withMessage('History must be an array of messages.'),
];

router.post('/', chatRules, validate, chatWithSafetyAgent);

module.exports = router;
