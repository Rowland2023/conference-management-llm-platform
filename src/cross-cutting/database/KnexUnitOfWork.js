/**
 * @file src/cross-cutting/database/knex-unit-of-work.js
 * @description Knex.js concrete implementation of the UnitOfWork application contract.
 */

const UnitOfWork = require('../../shared/application/persistence/UnitOfWork');

class KnexUnitOfWork extends UnitOfWork {
  /**
   * @param {Object} params
   * @param {import('knex').Knex} params.knex - Configured Knex instance
   * @param {Object} [params.options] - Transaction options (e.g. timeout)
   */
  constructor({ knex, options = {} }) {
    super();

    if (!knex) {
      throw new Error('[KnexUnitOfWork] Knex instance is required.');
    }

    this.knex = knex;
    this.options = {
      timeout: 10000, // 10s default transaction safety timeout
      ...options,
    };
    this.trackedAggregates = new Set();
  }

  /**
   * Registers an aggregate root for domain event collection (no-op for raw Knex UoW).
   * @param {Object} aggregate
   */
  track(aggregate) {
    if (aggregate) {
      this.trackedAggregates.add(aggregate);
    }
  }

  /**
   * Clears tracked aggregates.
   */
  clear() {
    this.trackedAggregates.clear();
  }

  /**
   * Executes work inside a Knex transaction scope.
   *
   * @param {(trx: import('knex').Knex.Transaction) => Promise<any>} work
   * @returns {Promise<any>}
   */
  async execute(work) {
    if (typeof work !== 'function') {
      throw new Error('[KnexUnitOfWork] Work parameter must be an executable function.');
    }

    try {
      return await this.knex.transaction(async (trx) => {
        return await work(trx);
      }, this.options);
    } finally {
      this.clear();
    }
  }
}

module.exports = KnexUnitOfWork;