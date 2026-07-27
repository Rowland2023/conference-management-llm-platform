/**
 * @file domain/RefundAmount.js
 * @description Pure Value Object for handling monetary refund amounts safely without floating-point errors.
 */

class RefundAmount {
  /**
   * @param {number} amountInMajor - The monetary value in major currency units (e.g. 1500.50 NGN)
   * @param {string} [currency='NGN'] - ISO 4217 3-letter currency code
   */
  constructor(amountInMajor, currency = 'NGN') {
    if (typeof amountInMajor !== 'number' || !Number.isFinite(amountInMajor) || amountInMajor <= 0) {
      throw new Error('[RefundAmount] Amount must be a positive finite number.');
    }

    if (!currency || typeof currency !== 'string' || currency.trim().length !== 3) {
      throw new Error('[RefundAmount] Currency must be a valid 3-letter ISO code.');
    }

    const normalizedCurrency = currency.trim().toUpperCase();

    // Store internally as integer minor units (e.g. Kobo / Cents) to eliminate floating-point drift
    // Math.round(val * 100) prevents floating point issues like 19.99 * 100 -> 1998.9999999999998
    this._minorAmount = Math.round(amountInMajor * 100);
    this.currency = normalizedCurrency;

    Object.freeze(this);
  }

  /**
   * Factory method to instantiate RefundAmount directly from minor units (e.g., Kobo).
   * @param {number} minorAmount - Integer amount in minor currency unit
   * @param {string} currency
   * @returns {RefundAmount}
   */
  static fromMinorUnit(minorAmount, currency = 'NGN') {
    if (!Number.isInteger(minorAmount) || minorAmount <= 0) {
      throw new Error('[RefundAmount] Minor unit amount must be a positive integer.');
    }
    return new RefundAmount(minorAmount / 100, currency);
  }

  /**
   * Returns the monetary amount in major units (e.g., 100.50).
   * @returns {number}
   */
  get amount() {
    return this._minorAmount / 100;
  }

  /**
   * Returns the monetary amount as an integer in minor units (e.g., 10050 Kobo).
   * Useful for DB persistence and payment gateway APIs (Paystack, Flutterwave, Stripe).
   * @returns {number}
   */
  get minorAmount() {
    return this._minorAmount;
  }

  /**
   * Value Object Equality Check.
   * @param {RefundAmount} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof RefundAmount)) return false;
    return this._minorAmount === other._minorAmount && this.currency === other.currency;
  }

  /**
   * Compares if this amount is strictly greater than another.
   * @param {RefundAmount} other
   * @returns {boolean}
   */
  isGreaterThan(other) {
    this._assertSameCurrency(other);
    return this._minorAmount > other._minorAmount;
  }

  /**
   * Adds another RefundAmount and returns a new instance.
   * @param {RefundAmount} other
   * @returns {RefundAmount}
   */
  add(other) {
    this._assertSameCurrency(other);
    return RefundAmount.fromMinorUnit(this._minorAmount + other._minorAmount, this.currency);
  }

  /**
   * Private invariant check ensuring operations happen across matching currencies.
   * @private
   */
  _assertSameCurrency(other) {
    if (!(other instanceof RefundAmount)) {
      throw new Error('[RefundAmount] Target comparison object must be an instance of RefundAmount.');
    }
    if (this.currency !== other.currency) {
      throw new Error(`[RefundAmount] Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}

module.exports = RefundAmount;