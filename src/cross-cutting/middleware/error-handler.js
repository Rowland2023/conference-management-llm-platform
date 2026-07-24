/**
 * @file src/presentation/middleware/error-handler.js
 * 
 * Global Express Error Handler mapping Domain & Infrastructure Errors 
 * to standardized HTTP response payloads.
 */
const {
  DomainError,
  InvalidArgumentError,
  UnbalancedEntryError,
  InsufficientFundsError,
  NotFoundError,
  ConcurrencyConflictError,
  DuplicateIdempotencyError,
} = require('../../domain/errors');

/**
 * Direct lookup map using error constructor names for O(1) performance.
 */
const DOMAIN_ERROR_MAP = new Map([
  [InvalidArgumentError.name, { status: 400, type: 'InvalidArgumentError' }],
  [InsufficientFundsError.name, { status: 422, type: 'InsufficientFundsError' }], // 422 Unprocessable Entity is preferred for business rule violations
  [UnbalancedEntryError.name, { status: 422, type: 'UnbalancedEntryError' }],
  [NotFoundError.name, { status: 404, type: 'NotFoundError' }],
  [ConcurrencyConflictError.name, { status: 409, type: 'ConcurrencyConflictError' }],
  [DuplicateIdempotencyError.name, { status: 409, type: 'DuplicateIdempotencyError' }],
]);

function errorHandler(err, req, res, next) {
  // 1. Check direct match in domain error map (O(1))
  const matchedDomainError = DOMAIN_ERROR_MAP.get(err.constructor.name);

  if (matchedDomainError) {
    return res.status(matchedDomainError.status).json({
      success: false,
      error: {
        type: matchedDomainError.type,
        message: err.message,
        ...(err.details && { details: err.details }), // Optional domain context
      },
    });
  }

  // 2. Fallback check for any subclass inheriting from base DomainError
  if (err instanceof DomainError) {
    const statusCode = err.statusCode || 400;
    return res.status(statusCode).json({
      success: false,
      error: {
        type: err.name || 'DomainError',
        message: err.message,
      },
    });
  }

  // 3. PostgreSQL Unique Constraint / Foreign Key Failures (Infrastructure Leak Guard)
  if (err.code === '23505') { // Postgres Unique Violation
    return res.status(409).json({
      success: false,
      error: {
        type: 'ConflictError',
        message: 'A resource with the specified unique constraint or idempotency key already exists.',
      },
    });
  }

  // 4. Critical / Unhandled Server Error
  const correlationId = req.headers['x-request-id'] || req.id || 'N/A';
  
  // Structured log for observability tools (Datadog, CloudWatch, ELK)
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    type: 'CRITICAL_SERVER_ERROR',
    correlationId,
    actor: req.actor || null,
    path: req.originalUrl,
    method: req.method,
    errorMessage: err.message,
    stack: err.stack,
  }));

  return res.status(500).json({
    success: false,
    error: {
      type: 'InternalServerError',
      message: 'An unexpected error occurred while processing the transaction.',
      correlationId, // Allows client to reference log entries when contacting support
    },
  });
}

module.exports = errorHandler;