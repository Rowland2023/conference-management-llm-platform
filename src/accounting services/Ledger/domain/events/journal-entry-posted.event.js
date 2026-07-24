const BaseDomainEvent = require('./base-domain.event');
const { InvalidArgumentError } = require('../errors');

class JournalEntryPostedEvent extends BaseDomainEvent {
  static EVENT_NAME = 'journal_entry.posted';

  constructor({ eventId, journalEntryId, idempotencyKey, lines, description = '', metadata = {}, occurredAt }) {
    if (!journalEntryId?.trim()) throw new InvalidArgumentError('journalEntryId required');
    if (!idempotencyKey?.trim()) throw new InvalidArgumentError('idempotencyKey required');
    if (!Array.isArray(lines) || lines.length < 2) throw new InvalidArgumentError('at least 2 lines required');

    const serializedLines = lines.map((line, i) => {
      if (!line.accountId || !line.direction || line.amount == null) {
        throw new InvalidArgumentError(`line ${i} invalid`);
      }
      return {
        accountId: line.accountId,
        amount: typeof line.amount === 'bigint' ? line.amount.toString() : String(line.amount),
        direction: line.direction,
        currency: line.currency,
      };
    });

    super({
      eventId,
      eventName: JournalEntryPostedEvent.EVENT_NAME,
      aggregateId: journalEntryId,
      payload: { journalEntryId, idempotencyKey, description, lines: serializedLines },
      metadata,
      occurredAt,
      version: 1,
    });
  }
}

module.exports = JournalEntryPostedEvent;