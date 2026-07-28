/**
 * @file src/domain/repositories/account.repository.js
 *
 * Domain repository interface for Account aggregates.
 * Concrete implementations belong in the Infrastructure layer.
 */

import { UnsupportedOperationError } from "../error/index.js";

export default class AccountRepository {
  constructor() {
    if (new.target === AccountRepository) {
      throw new UnsupportedOperationError(
        "Cannot instantiate abstract class AccountRepository directly."
      );
    }
  }

  /**
   * Finds an Account aggregate by its unique ID.
   *
   * @param {string} id
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<import("../aggregates/account/account.aggregate.js").default|null>}
   */
  async findById(id, options = {}) {
    throw new UnsupportedOperationError(
      "AccountRepository.findById() must be implemented."
    );
  }

  /**
   * Finds an Account aggregate using SELECT ... FOR UPDATE.
   *
   * @param {string} id
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<import("../aggregates/account/account.aggregate.js").default|null>}
   */
  async findByIdForUpdate(id, options = {}) {
    throw new UnsupportedOperationError(
      "AccountRepository.findByIdForUpdate() must be implemented."
    );
  }

  /**
   * Finds multiple Account aggregates using deterministic locking.
   *
   * Implementations should sort IDs before locking rows to avoid deadlocks.
   *
   * @param {string[]} ids
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<Array<import("../aggregates/account/account.aggregate.js").default>>}
   */
  async findByIdsForUpdate(ids, options = {}) {
    throw new UnsupportedOperationError(
      "AccountRepository.findByIdsForUpdate() must be implemented."
    );
  }

  /**
   * Finds an Account by account number.
   *
   * @param {string} accountNumber
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<import("../aggregates/account/account.aggregate.js").default|null>}
   */
  async findByAccountNumber(accountNumber, options = {}) {
    throw new UnsupportedOperationError(
      "AccountRepository.findByAccountNumber() must be implemented."
    );
  }

  /**
   * Persists an Account aggregate.
   *
   * @param {import("../aggregates/account/account.aggregate.js").default} account
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<void>}
   */
  async save(account, options = {}) {
    throw new UnsupportedOperationError(
      "AccountRepository.save() must be implemented."
    );
  }

  /**
   * Finds a Hold by idempotency key.
   *
   * @param {string} accountId
   * @param {string} idempotencyKey
   * @param {object} [options]
   * @param {object} [options.transaction]
   * @returns {Promise<import("../aggregates/account/hold.entity.js").default|null>}
   */
  async findHoldByIdempotencyKey(
    accountId,
    idempotencyKey,
    options = {}
  ) {
    throw new UnsupportedOperationError(
      "AccountRepository.findHoldByIdempotencyKey() must be implemented."
    );
  }
}