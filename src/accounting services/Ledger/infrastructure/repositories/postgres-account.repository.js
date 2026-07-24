/**
 * @file src/modules/ledger/infrastructure/repositories/postgres-account.repository.js
 * 
 * PostgreSQL Repository for Account Aggregates with row-level locking (FOR UPDATE)
 * and strict multi-tenant isolation.
 */
const db = require('../../../../cross-cutting/database/knex');
const AccountMapper = require('../mappers/account.mapper');

class PostgresAccountRepository {
  /**
   * Saves or updates an account aggregate within an optional transaction.
   * 
   * @param {Object} accountAggregate 
   * @param {Object} [options]
   * @param {import('knex').Knex.Transaction} [options.transaction]
   * @returns {Promise<void>}
   */
  async save(accountAggregate, options = {}) {
    const client = options.transaction || db;
    const persistenceData = AccountMapper.toPersistence(accountAggregate);

    if (!persistenceData.tenant_id) {
      throw new Error('Repository write error: tenant_id is required for account persistence.');
    }

    await client('accounts')
      .insert(persistenceData)
      .onConflict(['id', 'tenant_id'])
      .merge({
        name: persistenceData.name,
        available_balance: persistenceData.available_balance,
        pending_balance: persistenceData.pending_balance,
        status: persistenceData.status,
        metadata: persistenceData.metadata,
        updated_at: persistenceData.updated_at,
      });
  }

  /**
   * Finds an account by ID within a specific tenant context.
   * 
   * @param {string} tenantId 
   * @param {string} id 
   * @param {Object} [options]
   * @param {import('knex').Knex.Transaction} [options.transaction]
   * @returns {Promise<Object|null>}
   */
  async findById(tenantId, id, options = {}) {
    if (!tenantId) throw new Error('Tenant context (tenantId) is required.');

    const client = options.transaction || db;
    const row = await client('accounts')
      .where({ id, tenant_id: tenantId })
      .first();

    return AccountMapper.toDomain(row);
  }

  /**
   * Finds an account and acquires an explicit row lock (`FOR UPDATE`) within an active transaction.
   * 
   * @param {string} tenantId 
   * @param {string} id 
   * @param {Object} options 
   * @param {import('knex').Knex.Transaction} options.transaction
   * @returns {Promise<Object|null>}
   */
  async findByIdForUpdate(tenantId, id, options = {}) {
    if (!tenantId) throw new Error('Tenant context (tenantId) is required.');
    if (!options.transaction) {
      throw new Error('findByIdForUpdate requires an active Knex transaction context.');
    }

    const row = await options.transaction('accounts')
      .where({ id, tenant_id: tenantId })
      .forUpdate()
      .first();

    return AccountMapper.toDomain(row);
  }

  /**
   * Batch fetches and locks multiple accounts in deterministic order (sorted by UUID)
   * to eliminate PostgreSQL deadlocks during multi-account double-entry postings.
   * 
   * @param {string} tenantId 
   * @param {Array<string>} ids 
   * @param {Object} options 
   * @param {import('knex').Knex.Transaction} options.transaction
   * @returns {Promise<Array<Object>>}
   */
  async findManyByIdsForUpdate(tenantId, ids = [], options = {}) {
    if (!tenantId) throw new Error('Tenant context (tenantId) is required.');
    if (!options.transaction) {
      throw new Error('findManyByIdsForUpdate requires an active Knex transaction context.');
    }
    if (!ids.length) return [];

    // Deduplicate and sort IDs lexicographically to guarantee lock acquisition order
    const sortedUniqueIds = [...new Set(ids)].sort();

    const rows = await options.transaction('accounts')
      .where('tenant_id', tenantId)
      .whereIn('id', sortedUniqueIds)
      .orderBy('id', 'asc') // Lexicographical ordering prevents AB-BA lock cycles
      .forUpdate();

    return rows.map((row) => AccountMapper.toDomain(row));
  }
}

module.exports = PostgresAccountRepository;