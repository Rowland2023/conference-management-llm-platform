// domain/value-objects/Money.js
import BigNumber from 'bignumber.js';

// Enforce standard financial rounding (Half-Up)
const BN = BigNumber.clone({ ROUNDING_MODE: BigNumber.ROUND_HALF_UP });

export class Money {
  /**
   * @param {number|string|BigNumber|Money} amount
   * @param {string} [currency='NGN']
   */
  constructor(amount, currency = 'NGN') {
    let rawAmount = amount;
    if (amount instanceof Money) {
      rawAmount = amount.amount;
      currency = amount.currency;
    }

    const parsed = new BN(rawAmount || 0);
    if (parsed.isNaN()) {
      throw new Error(`Invalid monetary amount: ${amount}`);
    }

    // Always enforce exact 2-decimal financial rounding
    this._amount = parsed.decimalPlaces(2, BN.ROUND_HALF_UP);
    this._currency = String(currency).toUpperCase().trim();

    Object.freeze(this);
  }

  get amount() {
    return this._amount;
  }

  get currency() {
    return this._currency;
  }

  /**
   * Returns formatted string representation (e.g. "10500.50")
   */
  toFixed() {
    return this._amount.toFixed(2);
  }

  /**
   * Returns integer minor units (e.g. 1000 Kobo/Cents = 10.00 NGN)
   */
  toMinorUnits() {
    return this._amount.multipliedBy(100).toNumber();
  }

  // --- Arithmetic Operations ---

  add(other) {
    const otherMoney = this._coerce(other);
    this._assertSameCurrency(otherMoney);
    return new Money(this._amount.plus(otherMoney.amount), this._currency);
  }

  subtract(other) {
    const otherMoney = this._coerce(other);
    this._assertSameCurrency(otherMoney);
    return new Money(this._amount.minus(otherMoney.amount), this._currency);
  }

  multiply(factor) {
    return new Money(this._amount.multipliedBy(factor), this._currency);
  }

  // --- Comparisons & Guards ---

  isZero() {
    return this._amount.isZero();
  }

  isGreaterThanZero() {
    return this._amount.isGreaterThan(0);
  }

  isNegative() {
    return this._amount.isLessThan(0);
  }

  isEqualTo(other) {
    const otherMoney = this._coerce(other);
    this._assertSameCurrency(otherMoney);
    return this._amount.isEqualTo(otherMoney.amount);
  }

  isGreaterThan(other) {
    const otherMoney = this._coerce(other);
    this._assertSameCurrency(otherMoney);
    return this._amount.isGreaterThan(otherMoney.amount);
  }

  isGreaterThanOrEqualTo(other) {
    const otherMoney = this._coerce(other);
    this._assertSameCurrency(otherMoney);
    return this._amount.isGreaterThanOrEqualTo(otherMoney.amount);
  }

  isLessThan(other) {
    const otherMoney = this._coerce(other);
    this._assertSameCurrency(otherMoney);
    return this._amount.isLessThan(otherMoney.amount);
  }

  // --- Factory Helpers ---

  static zero(currency = 'NGN') {
    return new Money(0, currency);
  }

  /**
   * Creates a Money instance from minor units (e.g. 10500 minor -> 105.00 NGN)
   */
  static fromMinorUnits(minorAmount, currency = 'NGN') {
    const amount = new BN(minorAmount).dividedBy(100);
    return new Money(amount, currency);
  }

  // --- Internal Helpers ---

  _assertSameCurrency(other) {
    if (this._currency !== other.currency) {
      const error = new Error(
        `Currency mismatch: cannot perform operation between ${this._currency} and ${other.currency}`
      );
      error.name = 'CurrencyMismatchError';
      throw error;
    }
  }

  _coerce(other) {
    if (other instanceof Money) return other;
    return new Money(other, this._currency);
  }
}