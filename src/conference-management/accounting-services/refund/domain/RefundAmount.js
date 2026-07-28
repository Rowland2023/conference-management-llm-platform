/**
 * @file domain/RefundAmount.js
 * @description Pure Value Object for handling monetary refund amounts safely without floating-point errors.
 */

class RefundAmount {

  /**
   * @param {number} amountInMajor - Monetary value in major currency units
   * @param {string} [currency='NGN'] - ISO 4217 currency code
   */
  constructor(
    amountInMajor,
    currency = "NGN"
  ) {

    if (
      typeof amountInMajor !== "number" ||
      !Number.isFinite(amountInMajor) ||
      amountInMajor <= 0
    ) {
      throw new Error(
        "[RefundAmount] Amount must be a positive finite number."
      );
    }


    if (
      !currency ||
      typeof currency !== "string" ||
      currency.trim().length !== 3
    ) {
      throw new Error(
        "[RefundAmount] Currency must be a valid 3-letter ISO code."
      );
    }


    const normalizedCurrency =
      currency
        .trim()
        .toUpperCase();



    // Store internally as integer minor units
    // Example: NGN 1500.50 -> 150050 kobo
    this._minorAmount =
      Math.round(
        amountInMajor * 100
      );


    this.currency =
      normalizedCurrency;


    Object.freeze(this);

  }





  /**
   * Factory method from minor units.
   *
   * @param {number} minorAmount
   * @param {string} currency
   * @returns {RefundAmount}
   */
  static fromMinorUnit(
    minorAmount,
    currency = "NGN"
  ) {


    if (
      !Number.isInteger(minorAmount) ||
      minorAmount <= 0
    ) {
      throw new Error(
        "[RefundAmount] Minor unit amount must be a positive integer."
      );
    }


    return new RefundAmount(
      minorAmount / 100,
      currency
    );

  }





  /**
   * Amount in major units.
   *
   * @returns {number}
   */
  get amount() {

    return this._minorAmount / 100;

  }





  /**
   * Amount in minor units.
   *
   * @returns {number}
   */
  get minorAmount() {

    return this._minorAmount;

  }





  /**
   * Value object equality.
   *
   * @param {RefundAmount} other
   * @returns {boolean}
   */
  equals(other) {

    if (!(other instanceof RefundAmount)) {
      return false;
    }


    return (
      this._minorAmount === other._minorAmount &&
      this.currency === other.currency
    );

  }





  /**
   * Checks if this amount is greater than another.
   *
   * @param {RefundAmount} other
   * @returns {boolean}
   */
  isGreaterThan(other) {

    this._assertSameCurrency(other);

    return (
      this._minorAmount >
      other._minorAmount
    );

  }





  /**
   * Adds another RefundAmount.
   *
   * @param {RefundAmount} other
   * @returns {RefundAmount}
   */
  add(other) {

    this._assertSameCurrency(other);


    return RefundAmount.fromMinorUnit(
      this._minorAmount + other._minorAmount,
      this.currency
    );

  }





  /**
   * Ensures operations are performed on the same currency.
   *
   * @private
   */
  _assertSameCurrency(other) {


    if (!(other instanceof RefundAmount)) {

      throw new Error(
        "[RefundAmount] Target comparison object must be an instance of RefundAmount."
      );

    }


    if (this.currency !== other.currency) {

      throw new Error(
        `[RefundAmount] Currency mismatch: ${this.currency} vs ${other.currency}`
      );

    }

  }

}


export default RefundAmount;