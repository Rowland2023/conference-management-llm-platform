// src/shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js

export class PostgresOutboxRepository {
  constructor({ knex }) {
    if (!knex) {
      throw new Error(
        "PostgresOutboxRepository requires a Knex instance."
      );
    }

    this.knex = knex;
  }

  /**
   * Save events inside an existing transaction.
   */
  async save(events, trx) {
    const db = trx || this.knex;

    const list = Array.isArray(events)
      ? events
      : [events];

    const rows = list.map(event => ({
      id: event.metadata.eventId,
      event_name: event.metadata.eventName,
      aggregate_id: event.metadata.aggregateId,
      event_version: event.metadata.eventVersion,
      correlation_id: event.metadata.correlationId,
      causation_id: event.metadata.causationId,
      payload: JSON.stringify(event.payload),
      status: "PENDING",
      retry_count: 0,
      occurred_at: event.metadata.occurredAt
    }));

    await db("outbox_events").insert(rows);
  }

  /**
   * Fetch pending events.
   */
  async fetchAndLockPending(batchSize, maxRetries) {
    return this.knex.transaction(async trx => {

      const rows = await trx("outbox_events")
        .where("status", "PENDING")
        .where("retry_count", "<", maxRetries)
        .orderBy("occurred_at")
        .limit(batchSize)
        .forUpdate()
        .skipLocked();

      if (rows.length === 0) {
        return [];
      }

      const ids = rows.map(r => r.id);

      await trx("outbox_events")
        .whereIn("id", ids)
        .update({
          status: "PROCESSING"
        });

      return rows;
    });
  }

  /**
   * Mark dispatched.
   */
  async markAsDispatched(id) {
    await this.knex("outbox_events")
      .where({ id })
      .update({
        status: "DISPATCHED",
        processed_at: this.knex.fn.now()
      });
  }

  /**
   * Retry.
   */
  async incrementRetry(id, errorMessage) {
    await this.knex("outbox_events")
      .where({ id })
      .increment("retry_count", 1)
      .update({
        status: "PENDING",
        last_error: errorMessage
      });
  }
}