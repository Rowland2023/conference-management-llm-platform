/**
 * Serializes Account aggregate to HTTP response.
 * Single responsibility: Domain -> HTTP JSON
 */
class AccountSerializer {
  static fromAggregate(account) {
    if (!account) return null;

    // Aggregate contract is clear: getters return Money or BigInt
    const available = account.getAvailableBalance(); // Money or BigInt from your aggregate
    const pending = account.getPendingBalance ? account.getPendingBalance() : 0n;

    return {
      id: account.id,
      accountNumber: account.accountNumber,
      currency: account.currency,
      type: account.type,
      status: account.status,
      balance: {
        available: available.toString(), // Money VO already has toString()
        pending: pending.toString(),
      },
      createdAt: account.createdAt?.toISOString() ?? null,
    };
  }

  static fromReadModel(row) {
    if (!row) return null;
    return {
      id: row.id,
      accountNumber: row.account_number,
      currency: row.currency,
      type: row.type,
      status: row.status,
      balance: {
        available: row.available_balance.toString(),
        pending: row.pending_balance.toString(),
      },
      createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    };
  }

  // Alias for backward compat
  static serialize(account) {
    // Detect if it's aggregate (has getAvailableBalance) or read-model (has account_number)
    return account.getAvailableBalance 
      ? this.fromAggregate(account) 
      : this.fromReadModel(account);
  }

  static serializeMany(accounts = []) {
    return accounts.map(a => this.serialize(a)).filter(Boolean);
  }
}