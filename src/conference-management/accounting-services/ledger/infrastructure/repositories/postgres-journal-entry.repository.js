/**
 * @file postgres-journal-entry.repository.js
 *
 * PostgreSQL implementation of JournalEntryRepository.
 *
 * Responsibilities:
 * - Persist journal entries and lines
 * - Enforce tenant isolation
 * - Support row-level locking
 * - Support idempotency lookups
 * - Update journal entry status
 */

import db
  from "../../../../../cross-cutting/database/knex.js";

import JournalEntryMapper
  from "../mappers/journal-entry.mapper.js";

export class PostgresJournalEntryRepository {

  async save(
    aggregate,
    options = {}
  ) {

    const client =
      this.#getClient(options);

    const {
      entryRow,
      lineRows,
    } =
      JournalEntryMapper.toPersistence(
        aggregate
      );

    const tenantId =
      options.tenantId ??
      entryRow.tenant_id;

    if (!tenantId) {
      throw new Error(
        "tenant_id is required"
      );
    }

    entryRow.tenant_id = tenantId;

    await client("journal_entries")
      .insert(entryRow);

    if (lineRows.length === 0) {
      return;
    }

    const rows =
      lineRows.map((line) => ({
        ...line,
        tenant_id: tenantId,
      }));

    await client("journal_lines")
      .insert(rows);

  }

  async findByIdempotencyKey(
    tenantId,
    idempotencyKey,
    options = {}
  ) {

    if (
      !tenantId ||
      !idempotencyKey
    ) {
      return null;
    }

    const client =
      this.#getClient(options);

    let query =
      client("journal_entries")
        .where({
          tenant_id: tenantId,
          idempotency_key: idempotencyKey,
        });

    if (options.forUpdate) {
      query.forUpdate();
    }

    const entry =
      await query.first();

    if (!entry) {
      return null;
    }

    let lineQuery =
      client("journal_lines")
        .where({
          tenant_id: tenantId,
          journal_entry_id: entry.id,
        })
        .orderBy("id");

    if (options.forUpdate) {
      lineQuery.forUpdate();
    }

    const lines =
      await lineQuery;

    return JournalEntryMapper.toDomain(
      entry,
      lines
    );

  }

  async findByIdForUpdate(
    tenantId,
    id,
    options = {}
  ) {

    const client =
      this.#getClient(options);

    const entry =
      await client("journal_entries")
        .where({
          tenant_id: tenantId,
          id,
        })
        .forUpdate()
        .first();

    if (!entry) {
      return null;
    }

    const lines =
      await client("journal_lines")
        .where({
          tenant_id: tenantId,
          journal_entry_id: id,
        })
        .forUpdate()
        .orderBy("id");

    return JournalEntryMapper.toDomain(
      entry,
      lines
    );

  }

  async updateStatus(
    tenantId,
    id,
    status,
    metadataPatch = {},
    options = {}
  ) {

    const client =
      this.#getClient(options);

    await client("journal_entries")
      .where({
        tenant_id: tenantId,
        id,
      })
      .update({

        status,

        metadata:
          client.raw(
            "metadata || ?::jsonb",
            [
              JSON.stringify(
                metadataPatch
              ),
            ]
          ),

        updated_at:
          new Date(),

      });

  }

  #getClient(options) {

    return (
      options.transaction ??
      options.session ??
      db
    );

  }

}