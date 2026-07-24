/**
 * @file src/domain/aggregates/journal-entry/journal-entry.aggregate.js
 */
const JournalLine = require('./journal-line.entity');
const { UnbalancedEntryError, InvalidArgumentError, InvalidStateError } = require('../../errors');

class JournalEntryAggregate {
  /**
   * Private constructor — Use JournalEntryAggregate.create() or factory methods.
   */
  constructor({ id, idempotencyKey, description, status = 'POSTED', postedAt, metadata = {}, currency }) {
    if (!idempotencyKey || typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
      throw new InvalidArgumentError('JournalEntry: idempotencyKey must be a non-empty string');
    }

    const normalizedStatus = status?.toUpperCase();
    if (normalizedStatus !== 'POSTED' && normalizedStatus !== 'REVERSED') {
      throw new InvalidArgumentError(`JournalEntry: invalid status '${status}'`);
    }

    const parsedDate = postedAt ? new Date(postedAt) : new Date();
    if (Number.isNaN(parsedDate.getTime())) {
      throw new InvalidArgumentError('JournalEntry: postedAt must be a valid date');
    }

    this._id = id;
    this._idempotencyKey = idempotencyKey;
    this._description = description;
    this._status = normalizedStatus;
    this._postedAt = parsedDate;
    this._metadata = metadata;
    this._currency = currency?.toUpperCase();
    this._lines = [];
  }

  // Getters for Encapsulation
  get id() { return this._id; }
  get idempotencyKey() { return this._idempotencyKey; }
  get description() { return this._description; }
  get status() { return this._status; }
  get postedAt() { return this._postedAt; }
  get metadata() { return Object.freeze({ ...this._metadata }); }
  get currency() { return this._currency; }
  get lines() { return Object.freeze([...this._lines]); } // Prevents external array mutation

  /**
   * Adds a line item while enforcing currency consistency.
   * @param {Object} lineProps
   */
  addLine({ id, accountId, amount, direction, currency }) {
    if (this._status === 'REVERSED') {
      throw new InvalidStateError('Cannot add lines to a reversed journal entry');
    }

    const line = new JournalLine({ id, accountId, amount, direction, currency });

    // Enforce aggregate-wide currency homogeneity
    if (!this._currency) {
      this._currency = line.currency;
    } else if (line.currency !== this._currency) {
      throw new InvalidArgumentError(
        `JournalEntry: Line currency '${line.currency}' does not match entry currency '${this._currency}'`
      );
    }

    this._lines.push(line);
  }

  /**
   * Enforces Double-Entry Domain Invariant:
   * 1. Minimum 2 lines
   * 2. Total Debits === Total Credits
   */
  validateInvariants() {
    if (this._lines.length < 2) {
      throw new UnbalancedEntryError('Journal entry must contain at least two lines');
    }

    let totalDebits = 0n;
    let totalCredits = 0n;

    for (const line of this._lines) {
      if (line.direction === 'DEBIT') totalDebits += line.amount;
      if (line.direction === 'CREDIT') totalCredits += line.amount;
    }

    if (totalDebits !== totalCredits) {
      throw new UnbalancedEntryError(
        `Unbalanced entry: Total debits (${totalDebits.toString()}) != Total credits (${totalCredits.toString()}) in currency ${this._currency}`
      );
    }
  }

  /**
   * Factory method to construct and validate a fresh JournalEntryAggregate.
   */
  static create({ id, idempotencyKey, description, lines = [], metadata = {} }) {
    const entry = new JournalEntryAggregate({
      id,
      idempotencyKey,
      description,
      status: 'POSTED',
      metadata,
    });

    for (const lineProps of lines) {
      entry.addLine(lineProps);
    }

    entry.validateInvariants();
    return entry;
  }

  /**
   * Domain behavior: Generates an inverted reversing JournalEntry Aggregate
   * and transitions self state to 'REVERSED'.
   * 
   * @param {Object} params
   * @param {string} params.reversalIdempotencyKey
   * @param {string} params.reason
   * @returns {JournalEntryAggregate}
   */
  createReversal({ reversalIdempotencyKey, reason }) {
    if (this._status === 'REVERSED') {
      throw new InvalidStateError(`Entry ${this._id || this._idempotencyKey} has already been reversed`);
    }

    if (!reason || typeof reason !== 'string' || reason.trim() === '') {
      throw new InvalidArgumentError('Reversal reason is required for audit trail enforcement');
    }

    const reversalLines = this._lines.map((line) => ({
      accountId: line.accountId,
      amount: line.amount,
      direction: line.direction === 'DEBIT' ? 'CREDIT' : 'DEBIT', // Invert direction
      currency: line.currency,
    }));

    const reversal = JournalEntryAggregate.create({
      idempotencyKey: reversalIdempotencyKey,
      description: `Reversal of Entry ${this._id || 'N/A'}: ${reason}`,
      lines: reversalLines,
      metadata: {
        reversedEntryId: this._id,
        reversedIdempotencyKey: this._idempotencyKey,
        reason,
      },
    });

    this._status = 'REVERSED'; // Internal State Transition

    return reversal;
  }

  toJSON() {
    return {
      id: this._id,
      idempotencyKey: this._idempotencyKey,
      description: this._description,
      status: this._status,
      currency: this._currency,
      postedAt: this._postedAt.toISOString(),
      metadata: this._metadata,
      lines: this._lines.map((l) => l.toJSON()),
    };
  }
}

module.exports = JournalEntryAggregate;