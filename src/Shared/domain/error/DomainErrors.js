// src/shared/domain/error/DomainErrors.js

/**
 * Base class for all domain-level errors.
 * The domain is transport-agnostic and therefore contains
 * no HTTP-specific concepts such as status codes.
 */
export class DomainError extends Error {
  constructor(
    message,
    {
      code = "DOMAIN_ERROR",
      metadata = {},
      cause,
    } = {}
  ) {
    super(message, { cause });

    this.name = new.target.name;
    this.code = code;
    this.metadata = Object.freeze({ ...metadata });
    this.isOperational = true;

    Error.captureStackTrace?.(this, new.target);

    Object.freeze(this);
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      metadata: this.metadata,
    };
  }
}

/**
 * Invalid input or malformed value object.
 */
export class ValidationError extends DomainError {
  constructor(message, options = {}) {
    super(message, {
      code: "VALIDATION_ERROR",
      ...options,
    });
  }
}

/**
 * Aggregate invariant violated.
 */
export class InvariantViolationError extends DomainError {
  constructor(message, options = {}) {
    super(message, {
      code: "INVARIANT_VIOLATION",
      ...options,
    });
  }
}

/**
 * Valid input but violates a business rule.
 */
export class BusinessRuleViolationError extends DomainError {
  constructor(message, options = {}) {
    super(message, {
      code: "BUSINESS_RULE_VIOLATION",
      ...options,
    });
  }
}

/**
 * Aggregate or entity not found.
 */
export class NotFoundError extends DomainError {
  constructor(message, options = {}) {
    super(message, {
      code: "NOT_FOUND",
      ...options,
    });
  }
}

/**
 * Duplicate resource.
 */
export class DuplicateResourceError extends DomainError {
  constructor(message, options = {}) {
    super(message, {
      code: "DUPLICATE_RESOURCE",
      ...options,
    });
  }
}

/**
 * Illegal lifecycle transition.
 */
export class InvalidStateTransitionError extends DomainError {
  constructor(message, options = {}) {
    super(message, {
      code: "INVALID_STATE_TRANSITION",
      ...options,
    });
  }
}

/**
 * Optimistic concurrency conflict.
 */
export class ConcurrencyConflictError extends DomainError {
  constructor(message, options = {}) {
    super(message, {
      code: "CONCURRENCY_CONFLICT",
      ...options,
    });
  }
}

/**
 * Authorization failure within the domain.
 */
export class AuthorizationError extends DomainError {
  constructor(message, options = {}) {
    super(message, {
      code: "AUTHORIZATION_ERROR",
      ...options,
    });
  }
}

/**
 * Event payload could not be deserialized.
 */
export class EventDeserializationError extends DomainError {
  constructor(message, options = {}) {
    super(message, {
      code: "EVENT_DESERIALIZATION_ERROR",
      ...options,
    });
  }
}

// -----------------------------------------------------------------------------
// Backward compatibility aliases
// Remove these after the codebase has been fully migrated.
// -----------------------------------------------------------------------------

export class DomainValidationError extends ValidationError {}

export class DomainInvariantError extends InvariantViolationError {}

export class BusinessRuleValidationError extends BusinessRuleViolationError {}

export class UnauthorizedError extends AuthorizationError {}