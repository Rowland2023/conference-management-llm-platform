class JournalSerializer {
  static fromAggregate(entry) {
    if (!entry) return null;
    return {
      id: entry.id,
      idempotencyKey: entry.idempotencyKey,
      description: entry.description,
      status: entry.status, // entry-status VO -> string via .value or .toString()
      postedAt: entry.postedAt?.toISOString() ?? null,
      lines: entry.lines.map(line => ({
        id: line.id,
        accountId: line.accountId,
        amount: line.amount.toString(), // Money VO -> "10025 NGN" or BigInt -> "10025"
        direction: line.direction,
        currency: line.currency,
      })),
      metadata: entry.metadata ?? {},
    };
  }

  static fromReadModel(row, lines = []) {
    return {
      id: row.id,
      idempotencyKey: row.idempotency_key,
      description: row.description,
      status: row.status,
      postedAt: row.posted_at?.toISOString() ?? null,
      lines: lines.map(l => ({
        id: l.id,
        accountId: l.account_id,
        amount: l.amount.toString(),
        direction: l.direction,
        currency: l.currency,
      })),
      metadata: row.metadata ?? {},
    };
  }

  // Keep serialize() as router
  static serialize(entry) {
    return entry.getLines ? this.fromAggregate(entry) : this.fromReadModel(entry, entry.lines);
  }

  static serializeMany(entries) {
    return entries.map(e => this.serialize(e)).filter(Boolean);
  }
}