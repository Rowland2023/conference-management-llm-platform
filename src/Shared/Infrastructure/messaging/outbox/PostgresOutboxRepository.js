/**
 * @file src/shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js
 * @description Transactional Outbox Repository (Knex Implementation)
 */

export class PostgresOutboxRepository {

    /**
     * @param {Object} params
     * @param {import("knex").Knex} params.db
     */
    constructor({ db }) {

        if (!db) {
            throw new Error(
                "PostgresOutboxRepository requires a Knex instance."
            );
        }

        this.db = db;
        this.table = "outbox_events";

    }

    /**
     * Persist one or more domain events.
     *
     * IMPORTANT:
     * This MUST execute inside the same database transaction
     * that persists the aggregate.
     */
    async save(events, trx = this.db) {

        const items =
            Array.isArray(events)
                ? events
                : [events];

        const rows = items.map((event) => {

            const metadata = event.metadata ?? {};

            return {

                id: metadata.eventId,

                event_name: metadata.eventName,

                aggregate_id: metadata.aggregateId,

                event_version: metadata.eventVersion,

                correlation_id: metadata.correlationId,

                causation_id: metadata.causationId,

                payload: JSON.stringify(event.payload),

                status: "PENDING",

                retry_count: 0,

                occurred_at: metadata.occurredAt,

            };

        });

        await trx(this.table).insert(rows);

    }

    /**
     * Fetch a batch of pending events
     * and lock them for processing.
     */
    async fetchAndLockPending(
        batchSize = 100,
        maxRetries = 5,
    ) {

        return this.db.transaction(async (trx) => {

            const rows =
                await trx(this.table)
                    .where("status", "PENDING")
                    .where("retry_count", "<", maxRetries)
                    .orderBy("occurred_at")
                    .limit(batchSize)
                    .forUpdate()
                    .skipLocked();

            if (rows.length === 0) {
                return [];
            }

            await trx(this.table)
                .whereIn(
                    "id",
                    rows.map(row => row.id),
                )
                .update({
                    status: "PROCESSING",
                });

            return rows;

        });

    }

    /**
     * Mark event successfully dispatched.
     */
    async markAsDispatched(id) {

        await this.db(this.table)
            .where({ id })
            .update({

                status: "DISPATCHED",

                processed_at: this.db.fn.now(),

            });

    }

    /**
     * Increment retry counter.
     */
    async incrementRetry(
        id,
        errorMessage,
    ) {

        await this.db(this.table)
            .where({ id })
            .increment("retry_count", 1)
            .update({

                status: "PENDING",

                last_error: errorMessage,

            });

    }

    /**
     * Mark event permanently failed.
     */
    async markAsFailed(
        id,
        errorMessage,
    ) {

        await this.db(this.table)
            .where({ id })
            .update({

                status: "FAILED",

                last_error: errorMessage,

                processed_at: this.db.fn.now(),

            });

    }

}