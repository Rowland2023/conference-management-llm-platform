/**
 * @file src/domain/aggregates/journal-entry/journal-line.entity.js
 */

import { InvalidArgumentError } from "../../error/index.js";

const ISO_4217_REGEX = /^[A-Z]{3}$/;

export default class JournalLine {
  /**
   * @param {Object} props
   * @param {string} [props.id]
   * @param {string} props.accountId
   * @param {bigint|string|number} props.amount Amount strictly in minor units
   * @param {"DEBIT"|"CREDIT"} props.direction
   * @param {string} props.currency ISO-4217 currency code
   */
  constructor({
    id,
    accountId,
    amount,
    direction,
    currency,
  }) {
    // 1. Account ID Validation
    if (
      !accountId ||
      typeof accountId !== "string" ||
      accountId.trim() === ""
    ) {
      throw new InvalidArgumentError(
        "JournalLine: accountId must be a non-empty string"
      );
    }

    // 2. Direction Validation
    const normalizedDirection =
      direction?.toString().toUpperCase();

    if (
      normalizedDirection !== "DEBIT" &&
      normalizedDirection !== "CREDIT"
    ) {
      throw new InvalidArgumentError(
        "JournalLine: direction must be either 'DEBIT' or 'CREDIT'"
      );
    }

    // 3. Currency Validation
    const normalizedCurrency =
      currency?.toString().toUpperCase();

    if (
      !normalizedCurrency ||
      !ISO_4217_REGEX.test(normalizedCurrency)
    ) {
      throw new InvalidArgumentError(
        `JournalLine: currency must be a valid 3-letter ISO 4217 code. Got '${currency}'`
      );
    }

    // 4. Strict BigInt Conversion
    const bigIntAmount =
      JournalLine.parseMinorUnitsStrict(amount);

    if (bigIntAmount <= 0n) {
      throw new InvalidArgumentError(
        "JournalLine: amount must be strictly greater than zero (in minor units)"
      );
    }

    this.id = id;
    this.accountId = accountId;
    this.amount = bigIntAmount;
    this.direction = normalizedDirection;
    this.currency = normalizedCurrency;

    Object.freeze(this);
  }

  /**
   * Safely parses amount input into BigInt while rejecting decimals.
   *
   * @param {bigint|string|number} value
   * @returns {bigint}
   */
  static parseMinorUnitsStrict(value) {
    if (typeof value === "bigint") {
      return value;
    }

    if (value === null || value === undefined) {
      throw new InvalidArgumentError(
        "JournalLine: amount is required"
      );
    }

    const strValue = String(value).trim();

    if (strValue.includes(".")) {
      throw new InvalidArgumentError(
        `JournalLine: amount must be an integer string representing minor units (e.g., 1050 for $10.50). Received decimal: '${strValue}'`
      );
    }

    try {
      return BigInt(strValue);
    } catch {
      throw new InvalidArgumentError(
        `JournalLine: unable to parse amount '${strValue}' as a valid BigInt integer`
      );
    }
  }

  toJSON() {
    return {
      id: this.id,
      accountId: this.accountId,
      amount: this.amount.toString(),
      direction: this.direction,
      currency: this.currency,
    };
  }
}