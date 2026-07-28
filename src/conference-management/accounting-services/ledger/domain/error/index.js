export class BaseDomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class InvalidArgumentError extends BaseDomainError {}

export class InvalidStateError extends BaseDomainError {}

export class EntityNotFoundError extends BaseDomainError {}

export class AccountInactiveError extends InvalidStateError {}

export class AccountClosedError extends InvalidStateError {}

export class CurrencyMismatchError extends BaseDomainError {}

export class UnbalancedEntryError extends BaseDomainError {}

export class DuplicateJournalEntryError extends BaseDomainError {}

export class InsufficientFundsError extends BaseDomainError {}