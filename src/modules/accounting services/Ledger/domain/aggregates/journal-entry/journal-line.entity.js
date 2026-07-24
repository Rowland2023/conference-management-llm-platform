/**
 * @file src/domain/aggregates/journal-entry/journal-line.entity.js
 */
const { InvalidArgumentError } = require('../../errors');

const ISO_4217_REGEX = /^[A-Z]{3}$/;

class JournalLine {
  /**
   * @param {Object} props
   * @param {string} [props.id]
   * @param {string} props.accountId
   * @param {bigint|string|number} props.amount Amount strictly in minor units (integer cents)
   * @param {'DEBIT'|'CREDIT'} props.direction
   * @param {string} props.currency ISO-4217 currency code
   */
  constructor({ id, accountId, amount, direction, currency }) {
    // 1. Account ID Validation
    if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
      throw new InvalidArgumentError('JournalLine: accountId must be a non-empty string');
    }

    // 2. Direction Validation
    const normalizedDirection = direction?.toString().toUpperCase();
    if (normalizedDirection !== 'DEBIT' && normalizedDirection !== 'CREDIT') {
      throw new InvalidArgumentError("JournalLine: direction must be either 'DEBIT' or 'CREDIT'");
    }

    // 3. Currency Validation
    const normalizedCurrency = currency?.toString().toUpperCase();
    if (!normalizedCurrency || !ISO_4217_REGEX.test(normalizedCurrency)) {
      throw new InvalidArgumentError(
        `JournalLine: currency must be a valid 3-letter ISO 4217 code. Got '${currency}'`
      );
    }

    // 4. Strict BigInt Conversion (No Silent Truncation)
    const BigIntAmount = JournalLine.parseMinorUnitsStrict(amount);

    if (BigIntAmount <= 0n) {
      throw new InvalidArgumentError('JournalLine: amount must be strictly greater than zero (in minor units)');
    }

    this.id = id;
    this.accountId = accountId;
    this.amount = BigIntAmount;
    this.direction = normalizedDirection;
    this.currency = normalizedCurrency;

    Object.freeze(this); // Enforce Domain Entity Immutability
  }

  /**
   * Safely parses amount input into BigInt while explicitly rejecting decimals/floats.
   * @param {bigint|string|number} value
   * @returns {bigint}
   * @private
   */
  static parseMinorUnitsStrict(value) {
    if (typeof value === 'bigint') return value;

    if (value === null || value === undefined) {
      throw new InvalidArgumentError('JournalLine: amount is required');
    }

    const strValue = String(value).trim();

    // Reject floating point strings explicitly (e.g., "10.50" or "100.00")
    if (strValue.includes('.')) {
      throw new InvalidArgumentError(
        `JournalLine: amount must be an integer string representing minor units (e.g., 1050 for $10.50). Received decimal: '${strValue}'`
      );
    }

    try {
      return BigInt(strValue);
    } catch {
      throw new InvalidArgumentError(`JournalLine: unable to parse amount '${strValue}' as a valid BigInt integer`);
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

module.exports = JournalLine;