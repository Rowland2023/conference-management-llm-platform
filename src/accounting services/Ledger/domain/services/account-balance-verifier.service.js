/**
 * @file src/domain/services/account-balance-verifier.service.js
 */
const { InvalidArgumentError, CurrencyMismatchError, InsufficientFundsError } = require('../errors');
const Money = require('../value-objects/money.vo');

class AccountBalanceVerifierService {
  /**
   * Verifies if an account aggregate has sufficient available funds for a requested amount.
   *
   * @param {import('../aggregates/account/account.aggregate')} account
   * @param {bigint|string|number} amount - Minor units integer
   * @param {string} currency - 3-letter ISO code
   * @returns {boolean}
   */
  static canAfford(account, amount, currency) {
    if (!account || typeof account.getAvailableBalance !== 'function') {
      throw new InvalidArgumentError('AccountBalanceVerifierService: valid account aggregate is required');
    }

    if (!currency || typeof currency !== 'string' || currency.trim() === '') {
      throw new InvalidArgumentError('AccountBalanceVerifierService: currency ISO code is required');
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

    // Include overdraft limit if supported on aggregate, otherwise fallback to available balance
    const overdraftLimit = typeof account.getOverdraftLimit === 'function' 
      ? account.getOverdraftLimit() 
      : 0n;

    const netAvailable = account.getAvailableBalance() + overdraftLimit;

    return netAvailable >= required;
  }

  /**
   * Asserts that an account has sufficient funds. Throws InsufficientFundsError if not.
   *
   * @param {import('../aggregates/account/account.aggregate')} account
   * @param {bigint|string|number} amount - Minor units integer
   * @param {string} currency - 3-letter ISO code
   * @throws {InsufficientFundsError}
   */
  static assertSufficientBalance(account, amount, currency) {
    if (!this.canAfford(account, amount, currency)) {
      const available = account.getAvailableBalance();
      const required = Money.parseMinorUnitsStrict(amount);
      
      throw new InsufficientFundsError(
        `Insufficient available funds on account '${account.id}'. ` +
        `Required: ${required.toString()} ${currency.toUpperCase()}, Available: ${available.toString()} ${account.currency}`
      );
    }
  }
}

module.exports = AccountBalanceVerifierService;