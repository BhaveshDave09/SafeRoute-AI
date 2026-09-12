const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/helpers');

/**
 * Validates incoming request using express-validator rules.
 * If validation fails, sends a 422 response with field-level errors.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return errorResponse(
      res,
      'Validation failed. Please check your request data.',
      422,
      errors.array().map((e) => ({ field: e.path, message: e.msg }))
    );
  }
  next();
}

module.exports = { validate };
