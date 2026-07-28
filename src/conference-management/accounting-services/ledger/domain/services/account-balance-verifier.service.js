/**
 * @file ledger/domain/services/account-balance-verifier.service.js
 */

import {
  InvalidArgumentError,
  CurrencyMismatchError,
  InsufficientFundsError,
} from "../error/index.js";

import Money from "../value-objects/money.vo.js";

export default class AccountBalanceVerifierService {
  /**
   * Verifies whether an account has sufficient available funds.
   *
   * @param {import("../aggregates/account/account.aggregate.js").default} account
   * @param {bigint|string|number} amount
   * @param {string} currency
   * @returns {boolean}
   */
  static canAfford(account, amount, currency) {
    if (!account || typeof account.getAvailableBalance !== "function") {
      throw new InvalidArgumentError(
        "AccountBalanceVerifierService: valid account aggregate is required."
      );
    }

    if (!currency || typeof currency !== "string" || currency.trim() === "") {
      throw new InvalidArgumentError(
        "AccountBalanceVerifierService: currency ISO code is required."
      );
    }

    const required = Money.parseMinorUnitsStrict(amount);

    Money.assertPositive(required);

    const accountCurrency = account.currency?.toUpperCase();

    const requestedCurrency = currency.trim().toUpperCase();

    if (accountCurrency !== requestedCurrency) {
      throw new CurrencyMismatchError(
        `AccountBalanceVerifierService: currency mismatch on account '${account.id}'. ` +
        `Account: ${accountCurrency}, Requested: ${requestedCurrency}`
      );
    }

    const overdraftLimit =
      typeof account.getOverdraftLimit === "function"
        ? account.getOverdraftLimit()
        : 0n;

    const netAvailable =
      account.getAvailableBalance() + overdraftLimit;

    return netAvailable >= required;
  }

  /**
   * Throws if the account cannot cover the requested amount.
   *
   * @param {import("../aggregates/account/account.aggregate.js").default} account
   * @param {bigint|string|number} amount
   * @param {string} currency
   */
  static assertSufficientBalance(account, amount, currency) {
    if (!this.canAfford(account, amount, currency)) {
      const available = account.getAvailableBalance();

      const required = Money.parseMinorUnitsStrict(amount);

      throw new InsufficientFundsError(
        `Insufficient available funds on account '${account.id}'. ` +
        `Required: ${required} ${currency.toUpperCase()}, ` +
        `Available: ${available} ${account.currency}`
      );
    }
  }
}