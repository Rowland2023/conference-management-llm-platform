/**
 * Safely parses any numeric/string input into BigInt (minor units).
 * Truncates/guards against decimal strings to prevent runtime SyntaxErrors.
 */
const toBigIntSafe = (v) => {
  if (typeof v === 'bigint') return v;
  if (v === null || v === undefined || v === '') return 0n;
  
  const str = String(v).trim();
  
  // Handle float/decimal strings gracefully if DB returned DECIMAL/NUMERIC types
  const integerPart = str.split('.')[0];
  if (!integerPart || Number.isNaN(Number(integerPart))) return 0n;

  return BigInt(integerPart);
};

class GetLedgerBalanceUseCase {
  constructor({ accountRepository, journalEntryRepository, logger, metrics }) {
    this.accountRepository = accountRepository;
    this.journalEntryRepository = journalEntryRepository;
    this.logger = logger;
    this.metrics = metrics;
  }

  async execute({ accountId, currency, asOfDate, requestedBy }) {
    // 1. Input Validation
    if (!accountId || typeof accountId !== 'string') {
      throw new InvalidArgumentError('accountId must be a valid string');
    }

    const effectiveAsOfDate = asOfDate ? new Date(asOfDate) : new Date();
    if (Number.isNaN(effectiveAsOfDate.getTime())) {
      throw new InvalidArgumentError('asOfDate must be a valid ISO-8601 Date');
    }

    if (effectiveAsOfDate.getTime() > Date.now()) {
      throw new InvalidArgumentError('asOfDate cannot be in the future');
    }

    // 2. Account Existence & Status Verification
    const account = await this.accountRepository.findById(accountId);
    if (!account) throw new NotFoundError(`Account ${accountId} not found`);
    
    if (account.status && account.status !== 'ACTIVE') {
      throw new InvalidArgumentError(`Account ${accountId} is inactive (${account.status})`);
    }

    // 3. Currency Validation
    const targetCurrency = (currency || account.currency)?.toUpperCase();
    if (account.currency && targetCurrency !== account.currency.toUpperCase()) {
      throw new InvalidArgumentError(`Currency mismatch. Account operates in ${account.currency}`);
    }

    // 4. Calculate Ledger Totals
    const balanceDetails = await this.journalEntryRepository.calculateAccountBalance({
      accountId: account.id,
      currency: targetCurrency,
      asOfDate: effectiveAsOfDate,
    });

    const posted = toBigIntSafe(balanceDetails.postedBalance);
    const pending = toBigIntSafe(balanceDetails.pendingBalance);
    
    // Explicitly derive available balance (assuming pending is a positive hold value)
    const available = posted - pending;

    // 5. Observability
    const actorId = typeof requestedBy === 'object' ? requestedBy?.id || requestedBy?.userId : requestedBy;
    
    this.logger?.info({
      event: 'LEDGER_BALANCE_CHECKED',
      accountId: account.id,
      currency: targetCurrency,
      asOf: effectiveAsOfDate.toISOString(),
      requestedBy: actorId || 'SYSTEM',
    });

    this.metrics?.increment('ledger.balance.checked', 1, { currency: targetCurrency });

    // 6. Return Safe Serialization Payload
    return {
      accountId: account.id,
      accountName: account.name,
      currency: targetCurrency,
      balance: posted.toString(),           // Settled ledger balance (minor units)
      pendingBalance: pending.toString(),   // Total uncleared holds
      availableBalance: available.toString(), // Immediately usable funds
      asOf: effectiveAsOfDate.toISOString(),
    };
  }
}

module.exports = GetLedgerBalanceUseCase;