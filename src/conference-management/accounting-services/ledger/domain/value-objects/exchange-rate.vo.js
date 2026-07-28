/**
 * @file src/domain/value-objects/exchange-rate.vo.js
 *
 * Immutable Value Object representing a high-precision FX Exchange Rate.
 * Uses pure BigInt scaled integer arithmetic to eliminate IEEE-754 precision loss.
 */

import Money from "./money.vo.js";

import {
  InvalidArgumentError,
  CurrencyMismatchError,
} from "../error/index.js";

// Precision scalar: 10^8 (8 decimal places)
const RATE_SCALE = 100_000_000n;

export default class ExchangeRate {

  /**
   * @param {string} baseCurrency
   * @param {string} targetCurrency
   * @param {string|number|bigint} rate
   */
  constructor(
    baseCurrency,
    targetCurrency,
    rate
  ) {

    if (!baseCurrency || !targetCurrency) {
      throw new InvalidArgumentError(
        "ExchangeRate: base and target currencies are required."
      );
    }

    const cleanBase =
      String(baseCurrency)
        .trim()
        .toUpperCase();

    const cleanTarget =
      String(targetCurrency)
        .trim()
        .toUpperCase();

    if (
      cleanBase.length !== 3 ||
      cleanTarget.length !== 3
    ) {
      throw new InvalidArgumentError(
        "ExchangeRate: valid 3-letter ISO currency codes are required."
      );
    }

    const scaledRate =
      ExchangeRate.parseRateToScaledBigInt(rate);

    if (scaledRate <= 0n) {
      throw new InvalidArgumentError(
        "ExchangeRate: rate must be greater than zero."
      );
    }

    this._baseCurrency = cleanBase;
    this._targetCurrency = cleanTarget;
    this._scaledRate = scaledRate;

    Object.freeze(this);
  }

  //----------------------------------------------------------
  // Getters
  //----------------------------------------------------------

  get baseCurrency() {
    return this._baseCurrency;
  }

  get targetCurrency() {
    return this._targetCurrency;
  }

  get scaledRate() {
    return this._scaledRate;
  }

  //----------------------------------------------------------
  // Domain Behaviour
  //----------------------------------------------------------

  /**
   * Converts Money from base currency to target currency.
   *
   * Uses round-half-up arithmetic.
   *
   * @param {Money} sourceMoney
   * @returns {Money}
   */
  convert(sourceMoney) {

    if (!(sourceMoney instanceof Money)) {
      throw new InvalidArgumentError(
        "ExchangeRate.convert() requires a Money instance."
      );
    }

    if (
      sourceMoney.currency !==
      this._baseCurrency
    ) {
      throw new CurrencyMismatchError(
        `Cannot convert ${sourceMoney.currency}. Expected ${this._baseCurrency}.`
      );
    }

    // Identity conversion
    if (
      this._baseCurrency ===
      this._targetCurrency
    ) {
      return new Money(
        sourceMoney.amount,
        this._targetCurrency
      );
    }

    const rawProduct =
      sourceMoney.amount *
      this._scaledRate;

    const converted =
      (rawProduct + RATE_SCALE / 2n) /
      RATE_SCALE;

    return new Money(
      converted,
      this._targetCurrency
    );
  }

  /**
   * Returns the inverse exchange rate.
   *
   * @returns {ExchangeRate}
   */
  invert() {

    const invertedRate =
      (RATE_SCALE * RATE_SCALE) /
      this._scaledRate;

    return new ExchangeRate(
      this._targetCurrency,
      this._baseCurrency,
      invertedRate
    );
  }

  //----------------------------------------------------------
  // Equality
  //----------------------------------------------------------

  equals(other) {

    return (
      other instanceof ExchangeRate &&
      this._baseCurrency ===
        other.baseCurrency &&
      this._targetCurrency ===
        other.targetCurrency &&
      this._scaledRate ===
        other.scaledRate
    );
  }

  //----------------------------------------------------------
  // Serialization
  //----------------------------------------------------------

  toJSON() {

    const integer =
      (this._scaledRate / RATE_SCALE)
        .toString();

    const fraction =
      (this._scaledRate % RATE_SCALE)
        .toString()
        .padStart(8, "0")
        .replace(/0+$/, "");

    return {
      baseCurrency:
        this._baseCurrency,
      targetCurrency:
        this._targetCurrency,
      rate:
        fraction.length > 0
          ? `${integer}.${fraction}`
          : integer,
    };
  }

  toString() {

    const json = this.toJSON();

    return `1 ${this._baseCurrency} = ${json.rate} ${this._targetCurrency}`;
  }

  //----------------------------------------------------------
  // Utilities
  //----------------------------------------------------------

  /**
   * Converts a decimal string into an 8-decimal-place scaled BigInt.
   *
   * @param {string|number|bigint} rate
   * @returns {bigint}
   */
  static parseRateToScaledBigInt(rate) {

    if (typeof rate === "bigint") {
      return rate;
    }

    if (
      rate === null ||
      rate === undefined
    ) {
      throw new InvalidArgumentError(
        "ExchangeRate: rate is required."
      );
    }

    const value =
      String(rate).trim();

    if (
      value === "" ||
      Number.isNaN(Number(value))
    ) {
      throw new InvalidArgumentError(
        `Invalid exchange rate '${value}'.`
      );
    }

    const [
      whole = "0",
      decimal = "",
    ] = value.split(".");

    const fraction =
      decimal
        .padEnd(8, "0")
        .slice(0, 8);

    return BigInt(
      whole + fraction
    );
  }

}