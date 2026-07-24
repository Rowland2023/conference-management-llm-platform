/**
 * @file src/domain/value-objects/exchange-rate.vo.js
 * 
 * Immutable Value Object representing a high-precision FX Exchange Rate.
 * Uses pure BigInt scaled integer arithmetic to eliminate IEEE-754 precision loss.
 */
const Money = require('./money.vo');
const { InvalidArgumentError, CurrencyMismatchError } = require('../errors');

// Precision scalar: 10^8 (8 decimal places for rate accuracy, e.g. 1.23456789)
const RATE_SCALE = 100_000_000n;

class ExchangeRate {
  /**
   * @param {string} baseCurrency Currency converting FROM (e.g., 'USD')
   * @param {string} targetCurrency Currency converting TO (e.g., 'EUR')
   * @param {bigint|string|number} rate Decimal string (e.g. "0.920153") or BigInt scaled by 10^8
   */
  constructor(baseCurrency, targetCurrency, rate) {
    if (!baseCurrency || !targetCurrency) {
      throw new InvalidArgumentError('ExchangeRate: base and target currencies are required');
    }

    const cleanBase = String(baseCurrency).trim().toUpperCase();
    const cleanTarget = String(targetCurrency).trim().toUpperCase();

    if (cleanBase.length !== 3 || cleanTarget.length !== 3) {
      throw new InvalidArgumentError('ExchangeRate: valid 3-letter ISO currency codes are required');
    }

    // Convert input rate into a strict BigInt scaled by RATE_SCALE (10^8)
    const scaledRate = ExchangeRate.parseRateToScaledBigInt(rate);

    if (scaledRate <= 0n) {
      throw new InvalidArgumentError('ExchangeRate: rate must be strictly greater than zero');
    }

    this._baseCurrency = cleanBase;
    this._targetCurrency = cleanTarget;
    this._scaledRate = scaledRate; // Stored as BigInt scaled by 10^8

    Object.freeze(this);
  }

  get baseCurrency() { return this._baseCurrency; }
  get targetCurrency() { return this._targetCurrency; }
  get scaledRate() { return this._scaledRate; }

  /**
   * Converts a base Money object into target Money using pure BigInt scaled arithmetic.
   * Rounding mode: Round Half-Up (standard financial rounding).
   * 
   * @param {Money} sourceMoney 
   * @returns {Money}
   */
  convert(sourceMoney) {
    if (!(sourceMoney instanceof Money)) {
      throw new InvalidArgumentError('ExchangeRate: convert expects a valid Money instance');
    }

    if (sourceMoney.currency !== this._baseCurrency) {
      throw new CurrencyMismatchError(
        `ExchangeRate: cannot convert '${sourceMoney.currency}'. Expected base currency '${this._baseCurrency}'`
      );
    }

    // Identity conversion optimization
    if (this._baseCurrency === this._targetCurrency) {
      return new Money(sourceMoney.amount, this._targetCurrency);
    }

    // High precision BigInt multiplication & round-half-up division
    // Formula: (sourceAmount * scaledRate + (RATE_SCALE / 2)) / RATE_SCALE
    const rawProduct = sourceMoney.amount * this._scaledRate;
    const halfScale = RATE_SCALE / 2n;
    const convertedAmountBigInt = (rawProduct + halfScale) / RATE_SCALE;

    return new Money(convertedAmountBigInt, this._targetCurrency);
  }

  /**
   * Generates the inverted exchange rate (Target -> Base).
   * @returns {ExchangeRate}
   */
  invert() {
    // Inverse rate = (RATE_SCALE * RATE_SCALE) / currentScaledRate
    const invertedScaledRate = (RATE_SCALE * RATE_SCALE) / this._scaledRate;
    return new ExchangeRate(this._targetCurrency, this._baseCurrency, invertedScaledRate);
  }

  equals(other) {
    return (
      other instanceof ExchangeRate &&
      this._baseCurrency === other.baseCurrency &&
      this._targetCurrency === other.targetCurrency &&
      this._scaledRate === other.scaledRate
    );
  }

  /**
   * Parses rate input (string "0.920153" or BigInt) into an 8-decimal place scaled BigInt.
   * @private
   */
  static parseRateToScaledBigInt(rate) {
    if (typeof rate === 'bigint') {
      return rate;
    }

    if (rate === null || rate === undefined) {
      throw new InvalidArgumentError('ExchangeRate: rate value is required');
    }

    const strRate = String(rate).trim();
    if (strRate === '' || isNaN(Number(strRate))) {
      throw new InvalidArgumentError(`ExchangeRate: invalid numeric rate '${strRate}'`);
    }

    // Split whole and fractional parts to scale without floating point ops
    const parts = strRate.split('.');
    const integerPart = parts[0] || '0';
    let fractionalPart = parts[1] || '';

    // Pad or truncate fractional part to exactly 8 decimal digits (10^8 scale)
    if (fractionalPart.length < 8) {
      fractionalPart = fractionalPart.padEnd(8, '0');
    } else if (fractionalPart.length > 8) {
      fractionalPart = fractionalPart.slice(0, 8);
    }

    return BigInt(integerPart + fractionalPart);
  }

  toJSON() {
    // Reconstruct decimal string representation for readable JSON serialization
    const integerPart = (this._scaledRate / RATE_SCALE).toString();
    const fractionalPart = (this._scaledRate % RATE_SCALE).toString().padStart(8, '0');
    return {
      baseCurrency: this._baseCurrency,
      targetCurrency: this._targetCurrency,
      rate: `${integerPart}.${fractionalPart}`.replace(/\.?0+$/, ''), // trim trailing zeros
    };
  }

  toString() {
    const json = this.toJSON();
    return `1 ${this._baseCurrency} = ${json.rate} ${this._targetCurrency}`;
  }
}

module.exports = ExchangeRate;