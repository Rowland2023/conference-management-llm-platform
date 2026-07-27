/**
 * @file create-hold.usecase.js
 */
import {
  InvalidArgumentError,
  NotFoundError,
  InsufficientFundsError,
} from "../domain/error/index.js";

const toBigIntSafe = (v) => {
  if (typeof v === 'bigint') return v;
  if (v === null || v === undefined || v === '') return 0n;
  const str = String(v).trim().split('.')[0];
  if (!str || Number.isNaN(Number(str))) return 0n;
  return BigInt(str);
};

export class CreateHoldUseCase {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.holdRepository
   * @param {Object} dependencies.accountRepository
   * @param {Object} dependencies.journalEntryRepository
   * @param {Object} dependencies.unitOfWork
   * @param {Object} [dependencies.logger]
   * @param {Object} [dependencies.metrics]
   */
  constructor({ holdRepository, accountRepository, journalEntryRepository, unitOfWork, logger, metrics }) {
    this.holdRepository = holdRepository;
    this.accountRepository = accountRepository;
    this.journalEntryRepository = journalEntryRepository;
    this.unitOfWork = unitOfWork;
    this.logger = logger;
    this.metrics = metrics;
  }

  /**
   * @param {Object} dto
   * @param {string} dto.idempotencyKey
   * @param {string} dto.accountId
   * @param {string|number} dto.amount Amount to reserve (minor units)
   * @param {string} dto.currency
   * @param {string} dto.description
   * @param {Date} [dto.expiresAt] Optional expiration for the hold
   * @param {Object|string} [dto.requestedBy]
   */
  async execute({ idempotencyKey, accountId, amount, currency, description, expiresAt, requestedBy }) {
    // 1. Validate Input
    if (!idempotencyKey) throw new InvalidArgumentError('idempotencyKey is required');
    if (!accountId) throw new InvalidArgumentError('accountId is required');
    
    const amountBigInt = toBigIntSafe(amount);
    if (amountBigInt <= 0n) {
      throw new InvalidArgumentError('Hold amount must be greater than zero');
    }

    const expiryDate = expiresAt ? new Date(expiresAt) : null;
    if (expiryDate && Number.isNaN(expiryDate.getTime())) {
      throw new InvalidArgumentError('expiresAt must be a valid ISO-8601 Date');
    }
    if (expiryDate && expiryDate.getTime() <= Date.now()) {
      throw new InvalidArgumentError('expiresAt must be a date in the future');
    }

    // 2. Idempotency Check
    const existingHold = await this.holdRepository.findByIdempotencyKey(idempotencyKey);
    if (existingHold) {
      this.logger?.info({ event: 'HOLD_DUPLICATE_IGNORED', idempotencyKey });
      return { ...existingHold, isDuplicate: true };
    }

    // 3. Execute inside atomic transaction
    const holdResult = await this.unitOfWork.execute(async (session) => {
      // Step A: Lock the account to prevent concurrent balance modifications
      const [account] = await this.accountRepository.findAndLockByIds([accountId], { session });
      if (!account) {
        throw new NotFoundError(`Account ${accountId} not found`);
      }
      if (account.status && account.status !== 'ACTIVE') {
        throw new InvalidArgumentError(`Account is inactive (${account.status})`);
      }

      const targetCurrency = (currency || account.currency)?.toUpperCase();
      if (account.currency && targetCurrency !== account.currency.toUpperCase()) {
        throw new InvalidArgumentError(`Currency mismatch. Account operates in ${account.currency}`);
      }

      // Step B: Calculate Available Balance strictly inside the transaction lock
      const balanceDetails = await this.journalEntryRepository.calculateAccountBalance({
        accountId: account.id,
        currency: targetCurrency,
      }, { session });

      const posted = toBigIntSafe(balanceDetails.postedBalance);
      const pending = toBigIntSafe(balanceDetails.pendingBalance); // Includes existing active holds
      const availableBalance = posted - pending;

      // Step C: Authorize (Check if funds are sufficient)
      // Note: If this is a credit account (liability), logic might differ. Assuming standard deposit/asset logic here.
      if (availableBalance < amountBigInt) {
        throw new InsufficientFundsError(
          `Insufficient funds. Available: ${availableBalance.toString()}, Requested Hold: ${amountBigInt.toString()}`
        );
      }

      // Step D: Create the Hold Record
      const createdHold = await this.holdRepository.create({
        idempotencyKey,
        accountId: account.id,
        amount: amountBigInt.toString(),
        currency: targetCurrency,
        description,
        status: 'ACTIVE',
        expiresAt: expiryDate,
        createdAt: new Date(),
      }, { session });

      return createdHold;
    });

    // 4. Observability
    const actorId = typeof requestedBy === 'object' ? requestedBy?.id : requestedBy;
    this.logger?.info({
      event: 'FUNDS_HELD',
      holdId: holdResult.id,
      accountId,
      amount: amountBigInt.toString(),
      currency: holdResult.currency,
      requestedBy: actorId || 'SYSTEM',
    });
    this.metrics?.increment('ledger.hold.created', 1, { currency: holdResult.currency });

    return { ...holdResult, isDuplicate: false };
  }
}

module.exports = CreateHoldUseCase;