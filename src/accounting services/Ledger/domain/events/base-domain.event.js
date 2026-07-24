class BaseDomainEvent {
  constructor({ eventId, eventName, aggregateId, payload = {}, version = 1, occurredAt, metadata = {} }) {
    // ... your validations ...
    this._payload = Object.freeze({ ...payload }); // freeze payload too
    this._metadata = Object.freeze({ ...metadata });
    Object.freeze(this);
  }

  get payload() { return this._payload; }

  toJSON() {
    return {
      eventId: this._eventId,
      eventName: this._eventName,
      aggregateId: this._aggregateId,
      version: this._version,
      occurredAt: this._occurredAt.toISOString(),
      payload: this._payload, // now included
      metadata: this._metadata,
    };
  }
}

// Child usage:
class JournalEntryPostedEvent extends BaseDomainEvent {
  constructor({ aggregateId, journalEntry, metadata }) {
    super({
      eventName: 'journal_entry.posted',
      aggregateId,
      payload: {
        idempotencyKey: journalEntry.idempotencyKey,
        currency: journalEntry.currency,
        totalAmount: journalEntry.lines.reduce((s,l)=>s+l.amount,0n).toString(),
        lines: journalEntry.lines.map(l=>l.toJSON())
      },
      metadata
    });
  }
}