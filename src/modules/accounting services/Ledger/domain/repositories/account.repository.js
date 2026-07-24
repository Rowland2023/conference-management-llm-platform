/**
 * @file src/domain/repositories/account.repository.js
 * @abstract
 * 
 * Domain repository interface for Account aggregates.
 * Concrete implementations (e.g., PostgresAccountRepository) belong in the Infrastructure layer.
 */
const { UnsupportedOperationError } = require('../errors');

class AccountRepository {
  constructor() {
    if (new.target === AccountRepository) {
      throw new UnsupportedOperationError('Cannot instantiate abstract class AccountRepository directly');
    }
  }

  /**
   * Finds an Account Aggregate by its unique ID (Read-Only / No Lock).
   * @param {string} id 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<import('../aggregates/account/account.aggregate')|null>}
   */
  async findById(id, options = {}) {
    throw new UnsupportedOperationError('Method AccountRepository.findById() must be implemented');
  }

  /**
   * Finds an Account Aggregate by ID with a pessimistic lock (SELECT ... FOR UPDATE).
   * Essential for single-account operations like placing a balance hold.
   * @param {string} id 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<import('../aggregates/account/account.aggregate')|null>}
   */
  async findByIdForUpdate(id, options = {}) {
    throw new UnsupportedOperationError('Method AccountRepository.findByIdForUpdate() must be implemented');
  }

  /**
   * Finds multiple Account Aggregates by their IDs in a single query with row-level locks.
   * CRITICAL: Implementation must sort IDs deterministically before locking to prevent DB deadlocks!
   * @param {string[]} ids 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<import('../aggregates/account/account.aggregate')[]>}
   */
  async findByIdsForUpdate(ids, options = {}) {
    throw new UnsupportedOperationError('Method AccountRepository.findByIdsForUpdate() must be implemented');
  }

  /**
   * Finds an Account Aggregate by human-readable Account Number.
   * @param {string} accountNumber 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<import('../aggregates/account/account.aggregate')|null>}
   */
  async findByAccountNumber(accountNumber, options = {}) {
    throw new UnsupportedOperationError('Method AccountRepository.findByAccountNumber() must be implemented');
  }

  /**
   * Persists a new or updated Account Aggregate (including its holds and domain events).
   * @param {import('../aggregates/account/account.aggregate')} account 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<void>}
   */
  async save(account, options = {}) {
    throw new UnsupportedOperationError('Method AccountRepository.save() must be implemented');
  }

  /**
   * Finds an active Hold by its idempotency key to prevent duplicate reserve processing.
   * @param {string} accountId 
   * @param {string} idempotencyKey 
   * @param {object} [options]
   * @param {object} [options.transaction] - Database transaction handle
   * @returns {Promise<import('../aggregates/account/hold.entity')|null>}
   */
  async findHoldByIdempotencyKey(accountId, idempotencyKey, options = {}) {
    throw new UnsupportedOperationError('Method AccountRepository.findHoldByIdempotencyKey() must be implemented');
  }
}

module.exports = AccountRepository;