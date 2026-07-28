/**
 * @file src/domain/value-objects/money.vo.js
 *
 * Immutable Value Object representing monetary amounts in minor units.
 */

import {
  InvalidArgumentError,
  CurrencyMismatchError,
} from "../error/index.js";

export default class Money {

  constructor(amount, currency) {

    if (!currency || typeof currency !== "string") {
      throw new InvalidArgumentError(
        "Money: valid ISO currency required."
      );
    }

    const normalizedCurrency =
      currency.trim().toUpperCase();

    if (normalizedCurrency.length !== 3) {
      throw new InvalidArgumentError(
        `Invalid currency '${currency}'.`
      );
    }

    this._amount =
      Money.parseMinorUnitsStrict(amount);

    this._currency =
      normalizedCurrency;

    Object.freeze(this);
  }

  get amount() {
    return this._amount;
  }

  get currency() {
    return this._currency;
  }

  // ...
}