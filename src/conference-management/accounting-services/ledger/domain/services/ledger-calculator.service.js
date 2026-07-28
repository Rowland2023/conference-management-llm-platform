/**
 * @file src/domain/services/ledger-calculator.service.js
 */

import {
  InvalidArgumentError,
  UnbalancedJournalEntryError,
} from "../error/index.js";

/**
 * Standard Direction Enums
 */
export const DIRECTION = Object.freeze({
  DEBIT: "DEBIT",
  CREDIT: "CREDIT",
});

export class LedgerCalculatorService {
  /**
   * Calculates total debits and credits grouped by currency using pure BigInt math.
   *
   * @param {Array<Object>} lines
   * @returns {Map<string, { totalDebit: bigint, totalCredit: bigint, isBalanced: boolean }>}
   */
  static calculateTotals(lines) {
    if (!Array.isArray(lines) || lines.length < 2) {
      throw new InvalidArgumentError(
        "LedgerCalculatorService: lines must be an array with at least 2 entries"
      );
    }

    const totalsByCurrency = new Map();

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      if (!line || typeof line !== "object") {
        throw new InvalidArgumentError(
          `LedgerCalculatorService: line at index ${index} is invalid`
        );
      }

      const currency = String(line.currency || "")
        .trim()
        .toUpperCase();

      if (currency.length !== 3) {
        throw new InvalidArgumentError(
          `LedgerCalculatorService: valid ISO currency required at line ${index}`
        );
      }

      const direction = String(line.direction || "")
        .trim()
        .toUpperCase();

      if (
        direction !== DIRECTION.DEBIT &&
        direction !== DIRECTION.CREDIT
      ) {
        throw new InvalidArgumentError(
          `LedgerCalculatorService: direction must be 'DEBIT' or 'CREDIT' at line ${index}. Got '${line.direction}'`
        );
      }

      const amount = LedgerCalculatorService.toBigIntStrict(
        line.amount,
        index
      );

      if (amount <= 0n) {
        throw new InvalidArgumentError(
          `LedgerCalculatorService: line amount must be strictly greater than 0 at index ${index}`
        );
      }

      if (!totalsByCurrency.has(currency)) {
        totalsByCurrency.set(currency, {
          totalDebit: 0n,
          totalCredit: 0n,
        });
      }

      const bucket = totalsByCurrency.get(currency);

      if (direction === DIRECTION.DEBIT) {
        bucket.totalDebit += amount;
      } else {
        bucket.totalCredit += amount;
      }
    }

    const result = new Map();

    for (const [currency, bucket] of totalsByCurrency.entries()) {
      result.set(currency, {
        totalDebit: bucket.totalDebit,
        totalCredit: bucket.totalCredit,
        isBalanced: bucket.totalDebit === bucket.totalCredit,
      });
    }

    return result;
  }

  /**
   * Asserts that all debits equal credits across all currency buckets.
   *
   * @param {Array<Object>} lines
   */
  static assertBalanced(lines) {
    const totalsByCurrency =
      LedgerCalculatorService.calculateTotals(lines);

    for (const [currency, totals] of totalsByCurrency.entries()) {
      if (!totals.isBalanced) {
        const imbalance =
          totals.totalDebit - totals.totalCredit;

        throw new UnbalancedJournalEntryError(
          `Journal entry is out of balance for currency '${currency}'. ` +
            `Total Debits: ${totals.totalDebit}, ` +
            `Total Credits: ${totals.totalCredit} ` +
            `(Difference: ${imbalance} minor units)`
        );
      }
    }
  }

  /**
   * Ensures values are safely converted to BigInt.
   *
   * @private
   */
  static toBigIntStrict(value, index) {
    if (typeof value === "bigint") {
      return value;
    }

    if (value === null || value === undefined) {
      throw new InvalidArgumentError(
        `LedgerCalculatorService: amount is missing at line ${index}`
      );
    }

    const strValue = String(value).trim();

    if (strValue.includes(".")) {
      throw new InvalidArgumentError(
        `LedgerCalculatorService: amount must be minor units integer string. Received '${strValue}' at index ${index}`
      );
    }

    try {
      return BigInt(strValue);
    } catch {
      throw new InvalidArgumentError(
        `LedgerCalculatorService: invalid BigInt amount '${strValue}' at index ${index}`
      );
    }
  }
}