const express = require('express');
const { body, param } = require('express-validator');
const { saveContact, getContacts, deleteContact } = require('../controllers/emergencyController');
const { validate } = require('../middleware/validate');

const router = express.Router();

const saveContactRules = [
  body('name')
    .notEmpty().withMessage('Contact name is required.')
    .isString().withMessage('Contact name must be a string.')
    .trim(),
  body('phone')
    .optional({ checkFalsy: true })
    .isString().withMessage('Phone must be a string.')
    .trim(),
  body('email')
    .optional({ checkFalsy: true })
    .isEmail().withMessage('Please provide a valid email address.')
    .normalizeEmail(),
  body('relation')
    .optional()
    .isIn(['parent', 'spouse', 'sibling', 'friend', 'other'])
    .withMessage('Relation must be one of: parent, spouse, sibling, friend, other.'),
  body('user_id')
    .optional()
    .isString().withMessage('user_id must be a string.')
    .trim(),
];

const getContactsRules = [
  param('userId')
    .notEmpty().withMessage('User ID is required.')
];

const deleteContactRules = [
  param('id')
    .notEmpty().withMessage('Contact ID is required.'),
  body('user_id')
    .optional()
    .isString().withMessage('user_id must be a string.')
    .trim(),
];

// Routes
router.post('/', saveContactRules, validate, saveContact);
router.get('/:userId', getContactsRules, validate, getContacts);
router.delete('/:id', deleteContactRules, validate, deleteContact);

module.exports = router;
