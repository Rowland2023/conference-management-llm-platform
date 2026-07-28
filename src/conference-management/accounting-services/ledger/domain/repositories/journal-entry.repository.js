/**
 * @file src/domain/repositories/journal-entry.repository.js
 *
 * Domain repository interface for JournalEntry aggregates.
 * Concrete implementations (e.g., PostgresJournalEntryRepository)
 * belong in the Infrastructure layer.
 */

import { UnsupportedOperationError } from "../errors/index.js";

export class JournalEntryRepository {
  constructor() {
    if (new.target === JournalEntryRepository) {
      throw new UnsupportedOperationError(
        "Cannot instantiate abstract class JournalEntryRepository directly."
      );
    }
  }

  /**
   * Finds a Journal Entry aggregate by its unique ID (including all lines).
   *
   * @param {string} id
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<import("../aggregates/journal-entry/journal-entry.aggregate.js").default|null>}
   */
  async findById(id, options = {}) {
    throw new UnsupportedOperationError(
      "JournalEntryRepository.findById() must be implemented."
    );
  }

  /**
   * Finds a Journal Entry aggregate by its idempotency key.
   * Used to prevent duplicate journal postings.
   *
   * @param {string} idempotencyKey
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<import("../aggregates/journal-entry/journal-entry.aggregate.js").default|null>}
   */
  async findByIdempotencyKey(idempotencyKey, options = {}) {
    throw new UnsupportedOperationError(
      "JournalEntryRepository.findByIdempotencyKey() must be implemented."
    );
  }

  /**
   * Finds a Journal Entry aggregate by an external business reference.
   *
   * Examples:
   * - Invoice ID
   * - Payment reference
   * - Settlement batch ID
   *
   * @param {string} reference
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<import("../aggregates/journal-entry/journal-entry.aggregate.js").default|null>}
   */
  async findByReference(reference, options = {}) {
    throw new UnsupportedOperationError(
      "JournalEntryRepository.findByReference() must be implemented."
    );
  }

  /**
   * Persists a JournalEntry aggregate and its child entities.
   *
   * @param {import("../aggregates/journal-entry/journal-entry.aggregate.js").default} journalEntry
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<void>}
   */
  async save(journalEntry, options = {}) {
    throw new UnsupportedOperationError(
      "JournalEntryRepository.save() must be implemented."
    );
  }
}

export default JournalEntryRepository;