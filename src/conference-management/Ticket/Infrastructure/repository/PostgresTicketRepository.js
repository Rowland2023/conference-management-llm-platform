export class PostgresTicketRepository {
  constructor({
    knex,
    mapper,
    unitOfWork,
  }) {
    if (!knex) {
      throw new Error("PostgresTicketRepository requires a Knex instance.");
    }

    this.knex = knex;
    this.mapper = mapper;
    this.unitOfWork = unitOfWork;
    this.table = "tickets";
  }

  getClient(transaction) {
    return transaction || this.knex;
  }

  async save(ticket, transaction) {
    const db = this.getClient(transaction);

    const row = this.mapper.toPersistence(ticket);

    const [saved] = await db(this.table)
      .insert(row)
      .onConflict("idempotency_key")
      .ignore()
      .returning("*");

    if (!saved && row.idempotency_key) {
      return this.findByIdempotencyKey(
        row.idempotency_key,
        transaction
      );
    }

    return saved
      ? this.mapper.toDomain(saved)
      : null;
  }

  async findById(id, transaction) {
    const db = this.getClient(transaction);

    const row = await db(this.table)
      .where({ id })
      .first();

    return row
      ? this.mapper.toDomain(row)
      : null;
  }

  async findByIdForUpdate(id, transaction) {
    const db = this.getClient(transaction);

    const row = await db(this.table)
      .where({ id })
      .forUpdate()
      .first();

    return row
      ? this.mapper.toDomain(row)
      : null;
  }

  async findByIdempotencyKey(key, transaction) {
    const db = this.getClient(transaction);

    const row = await db(this.table)
      .where({
        idempotency_key: key,
      })
      .first();

    return row
      ? this.mapper.toDomain(row)
      : null;
  }
}