/**
 * @file domain/RefundErrors.js
 * @description Domain-specific exceptions for the Refund bounded context.
 */

class RefundDomainError extends Error {
  /**
   * @param {string} message - Human readable error explanation
   * @param {string} code - Machine readable error code for API responses/logs
   * @param {Object} [details={}] - Contextual metadata attached to the error
   */
  constructor(message, code = 'REFUND_DOMAIN_ERROR', details = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;

    // Correctly captures V8 stack trace excluding constructor noise
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

class InvalidRefundStateError extends RefundDomainError {
  constructor(message, details = {}) {
    super(message, 'INVALID_REFUND_STATE', details);
  }
}

class ExceededRefundLimitError extends RefundDomainError {
  /**
   * @param {number} requested - The requested major refund amount
   * @param {number} available - The available refundable limit
   * @param {string} [currency='NGN'] - Currency associated with the operation
   */
  constructor(requested, available, currency = 'NGN') {
    const message = `Requested refund of ${requested} ${currency} exceeds remaining refundable limit of ${available} ${currency}.`;
    super(message, 'EXCEEDED_REFUND_LIMIT', { requested, available, currency });
    
    this.requested = requested;
    this.available = available;
    this.currency = currency;
  }
}

class CurrencyMismatchError extends RefundDomainError {
  constructor(expectedCurrency, actualCurrency) {
    const message = `Currency mismatch: expected ${expectedCurrency}, but received ${actualCurrency}.`;
    super(message, 'CURRENCY_MISMATCH', { expectedCurrency, actualCurrency });
    
    this.expectedCurrency = expectedCurrency;
    this.actualCurrency = actualCurrency;
  }
}

module.exports = {
  RefundDomainError,
  InvalidRefundStateError,
  ExceededRefundLimitError,
  CurrencyMismatchError,
};