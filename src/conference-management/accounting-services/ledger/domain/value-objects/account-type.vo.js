/**
 * @file src/domain/value-objects/account-type.vo.js
 *
 * Value Object representing the fundamental double-entry account categories.
 * Encapsulates normal balance rules (Debit-normal vs Credit-normal).
 */

import { InvalidArgumentError } from "../error/index.js";

export default class AccountType {
  static ASSET = "ASSET";
  static LIABILITY = "LIABILITY";
  static EQUITY = "EQUITY";
  static REVENUE = "REVENUE";
  static EXPENSE = "EXPENSE";

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
      throw new InvalidArgumentError(
        "AccountType: value is required."
      );
    }

    const rawValue =
      value instanceof AccountType
        ? value.value
        : value;

    if (typeof rawValue !== "string") {
      throw new InvalidArgumentError(
        `AccountType: value must be a string. Received ${typeof rawValue}.`
      );
    }

    const normalized =
      rawValue
        .trim()
        .toUpperCase();

    if (
      !AccountType.VALID_TYPES.includes(
        normalized
      )
    ) {
      throw new InvalidArgumentError(
        `AccountType: invalid type '${rawValue}'. Valid values are: ${AccountType.VALID_TYPES.join(", ")}.`
      );
    }

    this._value = normalized;

    Object.freeze(this);
  }

  //---------------------------------------------------------
  // Getters
  //---------------------------------------------------------

  get value() {
    return this._value;
  }

  //---------------------------------------------------------
  // Domain Rules
  //---------------------------------------------------------

  /**
   * Assets and Expenses increase with debits.
   */
  isNormalDebitBalance() {
    return (
      this._value === AccountType.ASSET ||
      this._value === AccountType.EXPENSE
    );
  }

  /**
   * Liabilities, Equity and Revenue increase with credits.
   */
  isNormalCreditBalance() {
    return !this.isNormalDebitBalance();
  }

  //---------------------------------------------------------
  // Equality
  //---------------------------------------------------------

  equals(other) {
    if (other instanceof AccountType) {
      return this._value === other.value;
    }

    if (typeof other === "string") {
      return (
        this._value ===
        other.trim().toUpperCase()
      );
    }

    return false;
  }

  //---------------------------------------------------------
  // Serialization
  //---------------------------------------------------------

  toJSON() {
    return this._value;
  }

  toString() {
    return this._value;
  }
}