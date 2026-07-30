export class PostgresTicketRepository {
  constructor(pool) {
    if (!pool) throw new Error("pool required");
    this.pool = pool;
  }

  async save(ticket, client = this.pool) {
    // Staff: transaction + idempotency + minor units
    const query = `
      INSERT INTO tickets (
        id, event_id, user_id, status,
        price_minor, currency, idempotency_key, created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      ON CONFLICT (idempotency_key) DO NOTHING
      RETURNING *;
    `;
    const values = [
      ticket.id,
      ticket.eventId,
      ticket.userId,
      ticket.status,
      ticket.priceMinor, // BIGINT
      ticket.currency,
      ticket.idempotencyKey,
      ticket.createdAt || new Date(),
      new Date()
    ];

    const { rows } = await client.query(query, values);
    if (!rows[0] && ticket.idempotencyKey) {
      // Idempotent replay - fetch existing
      return this.findByIdempotencyKey(ticket.idempotencyKey, client);
    }
    return rows[0]? this.toDomain(rows[0]) : null;
  }

  async findByIdForUpdate(id, client) {
    // For refund anti-double check
    const { rows } = await client.query(
      `SELECT * FROM tickets WHERE id = $1 FOR UPDATE LIMIT 1`, [id]
    );
    return rows[0]? this.toDomain(rows[0]) : null;
  }

  toDomain(row) {
    return {
      id: row.id,
      eventId: row.event_id,
      userId: row.user_id,
      status: row.status,
      priceMinor: Number(row.price_minor),
      currency: row.currency,
      idempotencyKey: row.idempotency_key,
      createdAt: row.created_at
    };
  }
  //... rest with toDomain()
}