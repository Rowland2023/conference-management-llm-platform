const { InvalidArgumentError, NotFoundError, InvalidStateError, ConflictError } = require('../errors');

const toBigInt = (v) => typeof v === 'bigint' ? v : BigInt(String(v ?? '0').trim());
const hashLines = (lines) => lines.map(l => `${l.accountId}:${l.direction}:${toBigInt(l.amountInMinorUnits)}:${l.currency}`).sort().join('|');

class ReverseJournalEntryUseCase {
  constructor({ journalEntryRepository, accountRepository, unitOfWork, outboxRepository, logger, metrics }) {
    this.journalRepo = journalEntryRepository;
    this.accountRepo = accountRepository;
    this.uow = unitOfWork;
    this.outbox = outboxRepository;
    this.logger = logger;
    this.metrics = metrics;
  }

  async execute({ originalEntryId, reversalReason, idempotencyKey, requestedBy }) {
    if (!originalEntryId || !idempotencyKey || !reversalReason) {
      throw new InvalidArgumentError('originalEntryId, idempotencyKey, reversalReason are required');
    }
    if (reversalReason.length < 10) throw new InvalidArgumentError('reversalReason must be descriptive for audit');

    // 1. Fast-path idempotency + payload conflict detection
    const existing = await this.journalRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      // Prevent key reuse attack: same key, different intent
      if (existing.metadata?.reversedEntryId !== originalEntryId) {
        throw new ConflictError(`Idempotency key ${idempotencyKey} used for different entry`);
      }
      return { ...existing, isDuplicate: true };
    }

    let reversalEntry;
    try {
      reversalEntry = await this.uow.execute(async (session) => {
        // 2. Lock original entry FOR UPDATE - prevents double reversal
        const original = await this.journalRepo.findByIdForUpdate(originalEntryId, { session });
        if (!original) throw new NotFoundError(`Entry ${originalEntryId} not found`);
        if (original.status !== 'POSTED') {
          throw new InvalidStateError(`Only POSTED entries can be reversed, got ${original.status}`);
        }

        // 3. Deterministic lock order to prevent deadlocks (A,B vs B,A)
        const accountIds = [...new Set(original.lines.map(l => l.accountId))].sort();
        const accounts = await this.accountRepo.findAndLockByIds(accountIds, { session });
        if (accounts.length !== accountIds.length) throw new InvalidStateError('Account missing');
        
        for (const acc of accounts) {
          if (acc.status !== 'ACTIVE') throw new InvalidStateError(`Account ${acc.id} is ${acc.status}`);
        }

        // 4. Build reversal lines with safe BigInt + re-balance check
        const reversedLines = original.lines.map(line => ({
          accountId: line.accountId,
          amountInMinorUnits: toBigInt(line.amountInMinorUnits ?? line.amount).toString(),
          direction: line.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT',
          currency: line.currency,
        }));

        // Re-validate double-entry on reversed entry (never trust old data)
        let debits = 0n, credits = 0n;
        for (const l of reversedLines) {
          const amt = toBigInt(l.amountInMinorUnits);
          if (amt <= 0n) throw new InvalidStateError('Reversal amount must be > 0');
          l.direction === 'DEBIT' ? debits += amt : credits += amt;
        }
        if (debits !== credits) throw new InvalidStateError(`Reversed entry unbalanced: ${debits} != ${credits}`);

        // 5. Create reversal + outbox in SAME TX (transactional outbox)
        const payload = {
          idempotencyKey,
          description: `REVERSAL of #${originalEntryId}: ${reversalReason}`,
          currency: original.currency,
          status: 'POSTED',
          postedAt: new Date(),
          metadata: { reversedEntryId: originalEntryId, reversalReason, requestedBy, originalHash: hashLines(original.lines) },
          lines: reversedLines,
        };

        const created = await this.journalRepo.create(payload, { session });

        await this.journalRepo.updateStatus(originalEntryId, 'REVERSED', 
          { reversalEntryId: created.id }, { session });

        await this.outbox.create({
          aggregateId: created.id,
          eventType: 'LEDGER_ENTRY_REVERSED',
          payload: { originalEntryId, reversalEntryId: created.id, currency: original.currency, total: debits.toString() }
        }, { session });

        return created;
      });
    } catch (err) {
      // Handle concurrent duplicate
      if (err.code === '23505') {
        const dup = await this.journalRepo.findByIdempotencyKey(idempotencyKey);
        if (dup) return { ...dup, isDuplicate: true };
      }
      throw err;
    }

    // 6. Log AFTER commit - never log success before commit
    this.logger?.info({ originalEntryId, reversalEntryId: reversalEntry.id, requestedBy }, 'ledger_reversed');
    this.metrics?.increment('ledger.reversal.count', 1, { currency: reversalEntry.currency });

    return { ...reversalEntry, isDuplicate: false };
  }
}

module.exports = ReverseJournalEntryUseCase;