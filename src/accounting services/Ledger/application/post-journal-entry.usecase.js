const { InvalidArgumentError, UnbalancedEntryError, ConflictError } = require('../errors');

class PostJournalEntryUseCase {
  /**
   * @param {Object} dependencies
   * @param {Object} dependencies.journalEntryRepository
   * @param {Object} dependencies.accountRepository
   * @param {Object} dependencies.unitOfWork
   * @param {Object} [dependencies.logger]
   */
  constructor({ journalEntryRepository, accountRepository, unitOfWork, logger }) {
    this.journalEntryRepository = journalEntryRepository;
    this.accountRepository = accountRepository;
    this.unitOfWork = unitOfWork;
    this.logger = logger;
  }

  /**
   * @param {Object} dto
   * @param {string} dto.idempotencyKey Unique request key
   * @param {string} dto.description Transaction description
   * @param {Array<{ accountId: string, amountInMinorUnits: string|bigint, direction: 'DEBIT'|'CREDIT', currency: string }>} dto.lines
   * @param {Object} [dto.metadata]
   */
  async execute({ idempotencyKey, description, lines, metadata = {} }) {
    // 1. Basic Structural Validation
    if (!idempotencyKey || typeof idempotencyKey !== 'string') {
      throw new InvalidArgumentError('idempotencyKey is required and must be a string');
    }
    if (!Array.isArray(lines) || lines.length < 2) {
      throw new InvalidArgumentError('Journal entry must contain at least two lines');
    }

    // 2. Fast-Path Idempotency Check (Read Optimization)
    const existingEntry = await this.journalEntryRepository.findByIdempotencyKey(idempotencyKey);
    if (existingEntry) {
      return { ...existingEntry, isDuplicate: true };
    }

    // 3. Currency Uniformity & Precision Validation
    const baseCurrency = lines[0].currency;
    if (!baseCurrency || typeof baseCurrency !== 'string') {
      throw new InvalidArgumentError('Line 0 must specify a valid currency code');
    }

    let totalDebits = 0n;
    let totalCredits = 0n;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Enforce single currency per entry
      if (line.currency !== baseCurrency) {
        throw new InvalidArgumentError(
          `Currency mismatch on line ${i}. All lines must match entry currency '${baseCurrency}'`
        );
      }

      // Convert amount safely to BigInt (Minor Units)
      let amount;
      try {
        amount = BigInt(line.amountInMinorUnits);
      } catch {
        throw new InvalidArgumentError(`Invalid integer amount on line ${i}: ${line.amountInMinorUnits}`);
      }

      if (amount <= 0n) {
        throw new InvalidArgumentError(`Line ${i} amount must be positive`);
      }

      if (line.direction === 'DEBIT') {
        totalDebits += amount;
      } else if (line.direction === 'CREDIT') {
        totalCredits += amount;
      } else {
        throw new InvalidArgumentError(`Invalid direction '${line.direction}' on line ${i}`);
      }
    }

    // 4. Double-Entry Rule Enforcement: Debits === Credits
    if (totalDebits !== totalCredits) {
      throw new UnbalancedEntryError(
        `Total debits (${totalDebits.toString()}) must equal total credits (${totalCredits.toString()})`
      );
    }

    // 5. Execute Inside Isolated Transaction with Row Locks
    try {
      return await this.unitOfWork.execute(async (session) => {
        const accountIds = [...new Set(lines.map((l) => l.accountId))];
        const accounts = await this.accountRepository.findAndLockByIds(accountIds, { session });

        if (accounts.length !== accountIds.length) {
          throw new InvalidArgumentError('One or more specified accounts do not exist');
        }

        // Verify account statuses & currencies
        const accountMap = new Map(accounts.map((a) => [a.id, a]));
        for (const line of lines) {
          const account = accountMap.get(line.accountId);
          if (account.status && account.status !== 'ACTIVE') {
            throw new InvalidArgumentError(`Account ${account.id} is ${account.status}`);
          }
          if (account.currency && account.currency !== baseCurrency) {
            throw new InvalidArgumentError(
              `Account ${account.id} currency (${account.currency}) does not match entry currency (${baseCurrency})`
            );
          }
        }

        // Persist Journal Entry Header and Lines
        const entryPayload = {
          idempotencyKey,
          description,
          currency: baseCurrency,
          status: 'POSTED',
          postedAt: new Date(),
          metadata,
          lines: lines.map((line) => ({
            accountId: line.accountId,
            amountInMinorUnits: BigInt(line.amountInMinorUnits).toString(),
            direction: line.direction,
            currency: baseCurrency,
          })),
        };

        const createdEntry = await this.journalEntryRepository.create(entryPayload, { session });

        this.logger?.info({
          message: 'Journal entry posted successfully',
          idempotencyKey,
          entryId: createdEntry.id,
          totalAmount: totalDebits.toString(),
          currency: baseCurrency,
        });

        return { ...createdEntry, isDuplicate: false };
      });
    } catch (error) {
      // Catch DB Unique Constraint Violations (Postgres Code 23505) for concurrent duplicate requests
      if (error.code === '23505' || error.name === 'UniqueConstraintError') {
        const concurrentEntry = await this.journalEntryRepository.findByIdempotencyKey(idempotencyKey);
        if (concurrentEntry) {
          return { ...concurrentEntry, isDuplicate: true };
        }
      }
      throw error;
    }
  }
}

module.exports = PostJournalEntryUseCase;