/**
 * @file src/domain/aggregates/account/account-status.vo.js
 */
const { InvalidArgumentError, AccountInactiveError } = require('../../errors');

class AccountStatus {
  static ACTIVE = 'ACTIVE';
  static FROZEN = 'FROZEN';
  static SUSPENDED = 'SUSPENDED';
  static CLOSED = 'CLOSED';

  static VALID_STATUSES = Object.freeze([
    AccountStatus.ACTIVE,
    AccountStatus.FROZEN,
    AccountStatus.SUSPENDED,
    AccountStatus.CLOSED,
  ]);

  // Allowed state transition map for ledger compliance
  static ALLOWED_TRANSITIONS = Object.freeze({
    [AccountStatus.ACTIVE]: [AccountStatus.FROZEN, AccountStatus.SUSPENDED, AccountStatus.CLOSED],
    [AccountStatus.FROZEN]: [AccountStatus.ACTIVE, AccountStatus.CLOSED],
    [AccountStatus.SUSPENDED]: [AccountStatus.ACTIVE, AccountStatus.CLOSED],
    [AccountStatus.CLOSED]: [], // Terminal state
  });

  /**
   * @param {string|AccountStatus} value
   */
  constructor(value) {
    const rawValue = value instanceof AccountStatus ? value.value : value;
    const formatted = rawValue?.toString().trim().toUpperCase();

    if (!AccountStatus.VALID_STATUSES.includes(formatted)) {
      throw new InvalidArgumentError(
        `Invalid account status: '${value}'. Must be one of: ${AccountStatus.VALID_STATUSES.join(', ')}`
      );
    }

    this._value = formatted;
    Object.freeze(this); // Guarantees Value Object immutability
  }

  get value() {
    return this._value;
  }

  // --- Static Factory / Flyweight Helpers ---
  static active() { return new AccountStatus(AccountStatus.ACTIVE); }
  static frozen() { return new AccountStatus(AccountStatus.FROZEN); }
  static suspended() { return new AccountStatus(AccountStatus.SUSPENDED); }
  static closed() { return new AccountStatus(AccountStatus.CLOSED); }

  // --- Domain Capabilities & Invariants ---

  canDebit() {
    return this._value === AccountStatus.ACTIVE;
  }

  canCredit() {
    // Frozen accounts accept incoming credits (e.g., chargeback reversals, refunds)
    return this._value === AccountStatus.ACTIVE || this._value === AccountStatus.FROZEN;
  }

  canPlaceHold() {
    return this._value === AccountStatus.ACTIVE;
  }

  /**
   * Validates if transition to a target status is allowed.
   * @param {AccountStatus|string} targetStatus
   * @returns {boolean}
   */
  canTransitionTo(targetStatus) {
    const target = targetStatus instanceof AccountStatus ? targetStatus.value : targetStatus?.toUpperCase();
    return AccountStatus.ALLOWED_TRANSITIONS[this._value]?.includes(target) ?? false;
  }

  assertCanDebit() {
    if (!this.canDebit()) {
      throw new AccountInactiveError(`Account posting error: cannot debit account in '${this._value}' status`);
    }
  }

  assertCanCredit() {
    if (!this.canCredit()) {
      throw new AccountInactiveError(`Account posting error: cannot credit account in '${this._value}' status`);
    }
  }

  assertCanPlaceHold() {
    if (!this.canPlaceHold()) {
      throw new AccountInactiveError(`Account reserve error: cannot place hold on account in '${this._value}' status`);
    }
  }

  assertCanTransitionTo(targetStatus) {
    if (!this.canTransitionTo(targetStatus)) {
      const targetStr = targetStatus instanceof AccountStatus ? targetStatus.value : targetStatus;
      throw new InvalidArgumentError(`Illegal state transition from '${this._value}' to '${targetStr}'`);
    }
  }

  /**
   * Safe comparison against another AccountStatus instance OR string enum
   */
  equals(other) {
    if (!other) return false;
    if (other instanceof AccountStatus) {
      return this._value === other.value;
    }
    return typeof other === 'string' && this._value === other.trim().toUpperCase();
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}

module.exports = AccountStatus;