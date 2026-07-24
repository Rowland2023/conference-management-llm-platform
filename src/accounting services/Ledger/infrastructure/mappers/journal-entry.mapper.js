/**
 * @file src/modules/ledger/infrastructure/mappers/journal-entry.mapper.js
 */
const JournalEntryAggregate = require('../../domain/aggregates/journal-entry.aggregate');

class JournalEntryMapper {
  static toDomain(rawEntry, rawLines = []) {
    if (!rawEntry) return null;

    let metadata = {};
    try {
      metadata = typeof rawEntry.metadata === 'string' 
        ? JSON.parse(rawEntry.metadata) 
        : (rawEntry.metadata || {});
    } catch {
      metadata = {}; // fail safe, log warning in real prod
    }

    const lines = rawLines.map((line) => ({
      id: line.id,
      accountId: line.account_id,
      amountInMinorUnits: line.amount ? BigInt(line.amount) : 0n, // canonical name
      direction: line.direction,
      currency: line.currency,
    }));

    return new JournalEntryAggregate({
      id: rawEntry.id,
      idempotencyKey: rawEntry.idempotency_key,
      correlationId: rawEntry.correlation_id,
      tenantId: rawEntry.tenant_id,
      description: rawEntry.description,
      currency: rawEntry.currency,
      status: rawEntry.status,
      postedAt: rawEntry.posted_at ? new Date(rawEntry.posted_at) : null,
      lines,
      metadata,
    });
  }

  static toPersistence(aggregate) {
    const json = typeof aggregate.toJSON === 'function' ? aggregate.toJSON() : aggregate;

    const entryRow = {
      id: json.id,
      idempotency_key: json.idempotencyKey,
      correlation_id: json.correlationId, // you need this for tracing
      tenant_id: json.tenantId,
      description: json.description,
      currency: json.currency,
      status: json.status,
      posted_at: json.postedAt ? new Date(json.postedAt) : new Date(),
      metadata: JSON.stringify(json.metadata || {}),
    };

    const lineRows = (json.lines || []).map((line) => ({
      id: line.id || undefined, // let DB gen if new
      journal_entry_id: json.id,
      account_id: line.accountId,
      amount: (line.amountInMinorUnits ?? line.amount ?? 0n).toString(), // backwards compat
      direction: line.direction,
      currency: line.currency || json.currency,
    }));

    return { entryRow, lineRows };
  }
}

module.exports = JournalEntryMapper;