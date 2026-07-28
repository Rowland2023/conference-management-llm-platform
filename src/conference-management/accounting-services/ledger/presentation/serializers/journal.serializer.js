/**
 * Serializes Journal Entry aggregate/read model into HTTP response JSON.
 */
class JournalSerializer {
  static fromAggregate(entry) {
    if (!entry) return null;

    return {
      id: entry.id,
      idempotencyKey: entry.idempotencyKey,
      description: entry.description,
      status: entry.status,
      postedAt: entry.postedAt?.toISOString() ?? null,

      lines: entry.lines.map((line) => ({
        id: line.id,
        accountId: line.accountId,
        amount: line.amount.toString(),
        direction: line.direction,
        currency: line.currency,
      })),

      metadata: entry.metadata ?? {},
    };
  }

  static fromReadModel(row, lines = []) {
    if (!row) return null;

    return {
      id: row.id,
      idempotencyKey: row.idempotency_key,
      description: row.description,
      status: row.status,
      postedAt: row.posted_at?.toISOString() ?? null,

      lines: lines.map((line) => ({
        id: line.id,
        accountId: line.account_id,
        amount: line.amount.toString(),
        direction: line.direction,
        currency: line.currency,
      })),

      metadata: row.metadata ?? {},
    };
  }

  /**
   * Detect aggregate vs read model.
   */
  static serialize(entry) {
    return entry.getLines
      ? this.fromAggregate(entry)
      : this.fromReadModel(entry, entry.lines);
  }

  static serializeMany(entries = []) {
    return entries
      .map((entry) => this.serialize(entry))
      .filter(Boolean);
  }
}

export default JournalSerializer;