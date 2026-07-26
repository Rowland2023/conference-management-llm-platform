/**
 * @file src/domain/value-objects/money.vo.js
 * 
 * Immutable Value Object representing monetary amounts in minor units (e.g., cents, kobo).
 */
const { InvalidArgumentError, CurrencyMismatchError } = require('../errors');

class Money {
  /**
   * @param {bigint|string|number} amount Minor units integer
   * @param {string} currency ISO 4217 code (e.g., USD, EUR, NGN)
   */
  constructor(amount, currency) {
    if (!currency || typeof currency !== 'string' || currency.trim() === '') {
      throw new InvalidArgumentError('Money: valid 3-letter ISO currency string is required');
    }

    const cleanCurrency = currency.trim().toUpperCase();
    if (cleanCurrency.length !== 3) {
      throw new InvalidArgumentError(`Money: invalid ISO currency code '${currency}'`);
    }

    const bigintAmount = Money.parseMinorUnitsStrict(amount);

    this._amount = bigintAmount;
    this._currency = cleanCurrency;

    Object.freeze(this); // Guarantees immutability
  }

  get amount() { return this._amount; }
  get currency() { return this._currency; }

  // --- Static Utility & Factory Methods ---

  /**
   * Strictly parses minor units without permitting floating-point decimals.
   * @param {bigint|string|number} value 
   * @returns {bigint}
   */
  static parseMinorUnitsStrict(value) {
    if (typeof value === 'bigint') return value;
    if (value === null || value === undefined) {
      throw new InvalidArgumentError('Money: amount is required');
    }

    const strValue = String(value).trim();
    if (strValue.includes('.')) {
      throw new InvalidArgumentError(
        `Money: amount must be an integer string representing minor units (e.g., 10025 for $100.25). Received decimal: '${strValue}'`
      );
    }

    try {
      return BigInt(strValue);
    } catch {
      throw new InvalidArgumentError(`Money: unable to parse amount '${strValue}' as valid BigInt minor units`);
    }
  }

  /**
   * Asserts that a minor unit value or Money object is strictly positive (> 0).
   * @param {bigint|Money} target 
   */
  static assertPositive(target) {
    const rawAmount = target instanceof Money ? target.amount : Money.parseMinorUnitsStrict(target);
    if (rawAmount <= 0n) {
      throw new InvalidArgumentError(`Money: amount must be strictly greater than zero. Received ${rawAmount.toString()}`);
    }
  }

  /**
   * Factory method to create Money from minor units.
   */
  static fromMinor(amount, currency) {
    return new Money(amount, currency);
  }

  /**
   * Returns a zero-value Money object for the given currency.
   */
  static zero(currency) {
    return new Money(0n, currency);
  }

  // --- Instance Domain Operations ---

  add(other) {
    this._assertSameCurrency(other);
    return new Money(this._amount + other.amount, this._currency);
  }

  subtract(other) {
    this._assertSameCurrency(other);
    return new Money(this._amount - other.amount, this._currency);
  }

  isGreaterThan(other) {
    this._assertSameCurrency(other);
    return this._amount > other.amount;
  }

  isGreaterThanOrEqual(other) {
    this._assertSameCurrency(other);
    return this._amount >= other.amount;
  }

  isLessThan(other) {
    this._assertSameCurrency(other);
    return this._amount < other.amount;
  }

  isZero() {
    return this._amount === 0n;
  }

  isNegative() {
    return this._amount < 0n;
  }

  equals(other) {
    return (
      other instanceof Money &&
      this._amount === other.amount &&
      this._currency === other.currency
    );
  }

  toJSON() {
    return {
      amount: this._amount.toString(),
      currency: this._currency,
    };
  }

  toString() {
    return `${this._amount.toString()} ${this._currency}`;
  }

  _assertSameCurrency(other) {
    if (!(other instanceof Money)) {
      throw new InvalidArgumentError('Money operation requires a valid Money instance');
    }
    if (other.currency !== this._currency) {
      throw new CurrencyMismatchError(`Currency mismatch: ${this._currency} vs ${other.currency}`);
    }
  }
}

module.exports = Money;