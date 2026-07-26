/**
 * @file src/domain/value-objects/account-type.vo.js
 * 
 * Value Object representing the fundamental double-entry account categories.
 * Encapsulates normal balance rules (Debit-normal vs Credit-normal).
 */
const { InvalidArgumentError } = require('../errors');

class AccountType {
  static ASSET = 'ASSET';
  static LIABILITY = 'LIABILITY';
  static EQUITY = 'EQUITY';
  static REVENUE = 'REVENUE';
  static EXPENSE = 'EXPENSE';

  static VALID_TYPES = Object.freeze([
    AccountType.ASSET,
    AccountType.LIABILITY,
    AccountType.EQUITY,
    AccountType.REVENUE,
    AccountType.EXPENSE,
  ]);

  /**
   * @param {string|AccountType} value 
   */
  constructor(value) {
    if (!value) {
      throw new InvalidArgumentError('AccountType: value is required');
    }

    const rawValue = value instanceof AccountType ? value.value : value;
    
    if (typeof rawValue !== 'string') {
      throw new InvalidArgumentError(`AccountType: value must be a string, received ${typeof value}`);
    }

    const formatted = rawValue.trim().toUpperCase();

    if (!AccountType.VALID_TYPES.includes(formatted)) {
      throw new InvalidArgumentError(
        `AccountType: invalid type '${value}'. Permitted values: ${AccountType.VALID_TYPES.join(', ')}`
      );
    }

    this._value = formatted;
    Object.freeze(this);
  }

  get value() { return this._value; }

  // --- Domain Methods ---

  /**
   * Returns true if a DEBIT entry increases this account's balance (Assets & Expenses).
   * @returns {boolean}
   */
  isNormalDebitBalance() {
    return this._value === AccountType.ASSET || this._value === AccountType.EXPENSE;
  }

  /**
   * Returns true if a CREDIT entry increases this account's balance (Liabilities, Equity, Revenue).
   * @returns {boolean}
   */
  isNormalCreditBalance() {
    return !this.isNormalDebitBalance();
  }

  /**
   * Compares two AccountType instances for structural equality.
   * @param {any} other 
   * @returns {boolean}
   */
  equals(other) {
    if (other instanceof AccountType) {
      return this._value === other.value;
    }
    if (typeof other === 'string') {
      return this._value === other.trim().toUpperCase();
    }
    return false;
  }

  /**
   * Guarantees clean serialization during JSON.stringify()
   * @returns {string}
   */
  toJSON() {
    return this._value;
  }

  toString() {
    return this._value;
  }
}

module.exports = AccountType;