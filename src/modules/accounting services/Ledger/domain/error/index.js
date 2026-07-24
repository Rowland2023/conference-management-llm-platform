/**
 * @file src/domain/errors/index.js
 */

class BaseDomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class InvalidArgumentError extends BaseDomainError {}
class UnbalancedEntryError extends BaseDomainError {}
class InsufficientFundsError extends BaseDomainError {}
class NotFoundError extends BaseDomainError {}

module.exports = {
  BaseDomainError,
  InvalidArgumentError,
  UnbalancedEntryError,
  InsufficientFundsError,
  NotFoundError,
};