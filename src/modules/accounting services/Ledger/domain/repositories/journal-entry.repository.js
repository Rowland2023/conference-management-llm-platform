/**
 * @file src/domain/repositories/journal-entry.repository.js
 * @abstract
 * 
 * Domain repository interface for JournalEntry aggregates.
 * Concrete implementations (e.g., PostgresJournalEntryRepository) belong in the Infrastructure layer.
 */
const { UnsupportedOperationError } = require('../errors');

class JournalEntryRepository {
  constructor() {
    if (new.target === JournalEntryRepository) {
      throw new UnsupportedOperationError('Cannot instantiate abstract class JournalEntryRepository directly');
    }
  }

  /**
   * Finds a Journal Entry Aggregate by its unique ID (including all lines).
   * @param {string} id 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<import('../aggregates/journal-entry/journal-entry.aggregate')|null>}
   */
  async findById(id, options = {}) {
    throw new UnsupportedOperationError('Method JournalEntryRepository.findById() must be implemented');
  }

  /**
   * Finds a Journal Entry Aggregate by its idempotency key.
   * Critical for ledger write operations to prevent double-posting.
   * @param {string} idempotencyKey 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<import('../aggregates/journal-entry/journal-entry.aggregate')|null>}
   */
  async findByIdempotencyKey(idempotencyKey, options = {}) {
    throw new UnsupportedOperationError('Method JournalEntryRepository.findByIdempotencyKey() must be implemented');
  }

  /**
   * Finds a Journal Entry Aggregate by an external source reference or tracking ID 
   * (e.g., an invoice ID or external deposit reference).
   * @param {string} reference 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<import('../aggregates/journal-entry/journal-entry.aggregate')|null>}
   */
  async findByReference(reference, options = {}) {
    throw new UnsupportedOperationError('Method JournalEntryRepository.findByReference() must be implemented');
  }

  /**
   * Persists a complete JournalEntry Aggregate (the entry root, all its child lines, and domain events).
   * @param {import('../aggregates/journal-entry/journal-entry.aggregate')} journalEntry 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<void>}
   */
  async save(journalEntry, options = {}) {
    throw new UnsupportedOperationError('Method JournalEntryRepository.save() must be implemented');
  }
}

module.exports = JournalEntryRepository;