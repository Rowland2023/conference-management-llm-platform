// ledger/domain/error/index.js

export class BaseDomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidArgumentError extends BaseDomainError {}

export class UnbalancedEntryError extends BaseDomainError {}

export class InsufficientFundsError extends BaseDomainError {}

export class NotFoundError extends BaseDomainError {}