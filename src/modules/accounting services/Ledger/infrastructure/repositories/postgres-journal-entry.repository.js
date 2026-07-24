const db = require('../../../../cross-cutting/database/knex');
const JournalEntryMapper = require('../mappers/journal-entry.mapper');

class PostgresJournalEntryRepository {
  async save(aggregate, { transaction, tenantId } = {}) {
    const client = transaction || db;
    const { entryRow, lineRows } = JournalEntryMapper.toPersistence(aggregate);

    const finalTenantId = tenantId || entryRow.tenant_id;
    if (!finalTenantId) throw new Error('tenant_id required');

    entryRow.tenant_id = finalTenantId;

    // Do not ignore - let DB throw 23505 and handle in UseCase
    // If you want upsert, return existing
    try {
      await client('journal_entries').insert(entryRow);
    } catch (err) {
      if (err.code === '23505') throw err; // bubble to UseCase for idempotent replay
      throw err;
    }

    if (lineRows.length) {
      const linesWithTenant = lineRows.map(l => ({ ...l, tenant_id: finalTenantId }));
      await client('journal_lines').insert(linesWithTenant);
    }
  }

  async findByIdempotencyKey(tenantId, idempotencyKey, { transaction, forUpdate = false } = {}) {
    if (!tenantId || !idempotencyKey) return null;
    const client = transaction || db;

    let query = client('journal_entries').where({ tenant_id: tenantId, idempotency_key: idempotencyKey }).first();
    if (forUpdate) query = query.forUpdate(); // critical for reversal

    const rawEntry = await query;
    if (!rawEntry) return null;

    const rawLines = await client('journal_lines')
      .where({ tenant_id: tenantId, journal_entry_id: rawEntry.id })
      .orderBy('id', 'asc')
      .modify(q => { if (forUpdate) q.forUpdate(); });

    return JournalEntryMapper.toDomain(rawEntry, rawLines);
  }

  async findByIdForUpdate(tenantId, id, { transaction }) {
    const client = transaction || db;
    const rawEntry = await client('journal_entries')
      .where({ tenant_id: tenantId, id })
      .forUpdate()
      .first();
    if (!rawEntry) return null;

    const rawLines = await client('journal_lines')
      .where({ tenant_id: tenantId, journal_entry_id: id })
      .forUpdate()
      .orderBy('id', 'asc');

    return JournalEntryMapper.toDomain(rawEntry, rawLines);
  }

  async updateStatus(tenantId, id, status, metadataPatch, { transaction }) {
    const client = transaction || db;
    await client('journal_entries')
      .where({ tenant_id: tenantId, id })
      .update({ 
        status, 
        metadata: client.raw(`metadata || ?::jsonb`, [JSON.stringify(metadataPatch)]),
        updated_at: new Date() 
      });
  }
}