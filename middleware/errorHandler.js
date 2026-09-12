const { errorResponse } = require('../utils/helpers');

/**
 * Global error handler middleware.
 * Catches any error passed via next(err) and returns a clean JSON response.
 */
function errorHandler(err, req, res, next) {
  console.error('[ERROR]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Handle known error types
  if (err.name === 'SyntaxError' && err.status === 400) {
    return errorResponse(res, 'Invalid JSON in request body.', 400);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message =
    statusCode === 500
      ? 'An internal server error occurred. Please try again later.'
      : err.message;

  return errorResponse(res, message, statusCode);
}

/**
 * 404 handler for undefined routes.
 */
function notFoundHandler(req, res) {
  return errorResponse(
    res,
    `Route ${req.method} ${req.originalUrl} not found.`,
    404
  );
}

module.exports = { errorHandler, notFoundHandler };
