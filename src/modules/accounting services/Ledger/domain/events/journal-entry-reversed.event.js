/**
 * @file src/domain/events/journal-entry-reversed.event.js
 */
const BaseDomainEvent = require('./base-domain.event');
const { InvalidArgumentError } = require('../errors');

class JournalEntryReversedEvent extends BaseDomainEvent {
  static EVENT_NAME = 'journal_entry.reversed';

  /**
   * @param {Object} props
   * @param {string} [props.eventId]
   * @param {string} props.originalJournalEntryId The entry being reversed
   * @param {string} props.reversalJournalEntryId The new counter-entry executing the reversal
   * @param {string} [props.reason='Unspecified reversal']
   * @param {Object} [props.metadata] Correlation/tracing context
   * @param {Date|string} [props.occurredAt]
   */
  constructor({
    eventId,
    originalJournalEntryId,
    reversalJournalEntryId,
    reason = 'Unspecified reversal',
    metadata = {},
    occurredAt,
  }) {
    if (!originalJournalEntryId || typeof originalJournalEntryId !== 'string' || originalJournalEntryId.trim() === '') {
      throw new InvalidArgumentError('JournalEntryReversedEvent: originalJournalEntryId is required');
    }
    if (!reversalJournalEntryId || typeof reversalJournalEntryId !== 'string' || reversalJournalEntryId.trim() === '') {
      throw new InvalidArgumentError('JournalEntryReversedEvent: reversalJournalEntryId is required');
    }

    const cleanReason = String(reason).trim() || 'Unspecified reversal';

    // Delegate payload and envelope metadata construction to BaseDomainEvent
    super({
      eventId,
      eventName: JournalEntryReversedEvent.EVENT_NAME,
      aggregateId: originalJournalEntryId,
      version: 1,
      occurredAt,
      metadata,
      payload: {
        originalJournalEntryId,
        reversalJournalEntryId,
        reason: cleanReason,
      },
    });

    Object.freeze(this);
  }
}

module.exports = JournalEntryReversedEvent;