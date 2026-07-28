/**
 * Serializes Hold aggregate/read model into HTTP response JSON.
 */
class HoldSerializer {
  static fromAggregate(hold) {
    if (!hold) return null;

    return {
      id: hold.id,
      accountId: hold.accountId,
      amount: hold.amount.toString(), // Money VO
      currency: hold.currency,
      reason: hold.reason,
      status: hold.status,
      expiresAt: hold.expiresAt?.toISOString() ?? null,
      createdAt: hold.createdAt?.toISOString() ?? null,
      releasedAt: hold.releasedAt?.toISOString() ?? null,
    };
  }

  static fromReadModel(row) {
    if (!row) return null;

    return {
      id: row.id,
      accountId: row.account_id,
      amount: row.amount.toString(),
      currency: row.currency,
      reason: row.reason,
      status: row.status,
      expiresAt: row.expires_at?.toISOString() ?? null,
      createdAt: row.created_at?.toISOString() ?? null,
      releasedAt: row.released_at?.toISOString() ?? null,
    };
  }

  static serialize(hold) {
    return hold.getAmount
      ? this.fromAggregate(hold)
      : this.fromReadModel(hold);
  }

  static serializeMany(holds = []) {
    return holds
      .map((hold) => this.serialize(hold))
      .filter(Boolean);
  }
}

export default HoldSerializer;