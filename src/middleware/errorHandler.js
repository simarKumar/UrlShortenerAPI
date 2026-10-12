/**
 * Centralized global error handling middleware.
 */
function errorHandler(err, req, res, _next) {
  console.error('Unhandled error:', err);

  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
