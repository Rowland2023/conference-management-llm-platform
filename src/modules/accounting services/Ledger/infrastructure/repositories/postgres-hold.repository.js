/**
 * @file src/modules/ledger/infrastructure/repositories/postgres-hold.repository.js
 * 
 * PostgreSQL Repository for Account Holds (`account_holds` table).
 * Manages balance authorizations, releases, and state locking within tenant boundaries.
 */
const db = require('../../../../cross-cutting/database/knex');
const HoldMapper = require('../mappers/hold.mapper');

class PostgresHoldRepository {
  /**
   * Persists or updates a Hold aggregate.
   * Uses ON CONFLICT on (tenant_id, idempotency_key) to guarantee idempotency under retries.
   * 
   * @param {Object} holdAggregate 
   * @param {Object} [options]
   * @param {import('knex').Knex.Transaction} [options.transaction]
   */
  async save(holdAggregate, options = {}) {
    const client = options.transaction || db;
    const row = HoldMapper.toPersistence(holdAggregate);

    if (!row.tenant_id) {
      throw new Error('Repository write error: tenant_id is required for hold persistence.');
    }

    await client('account_holds')
      .insert(row)
      .onConflict(['tenant_id', 'idempotency_key'])
      .merge({
        status: row.status,
        reason: row.reason,
        metadata: row.metadata,
        expires_at: row.expires_at,
        updated_at: row.updated_at,
      });
  }

  /**
   * Finds a hold by ID scoped strictly to a tenant.
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
    const row = await client('account_holds')
      .where({ id, tenant_id: tenantId })
      .first();

    return HoldMapper.toDomain(row);
  }

  /**
   * Finds a hold by idempotency key for retry detection.
   * 
   * @param {string} tenantId 
   * @param {string} idempotencyKey 
   * @param {Object} [options]
   * @param {import('knex').Knex.Transaction} [options.transaction]
   * @returns {Promise<Object|null>}
   */
  async findByIdempotencyKey(tenantId, idempotencyKey, options = {}) {
    if (!tenantId) throw new Error('Tenant context (tenantId) is required.');
    if (!idempotencyKey) return null;

    const client = options.transaction || db;
    const row = await client('account_holds')
      .where({ tenant_id: tenantId, idempotency_key: idempotencyKey })
      .first();

    return HoldMapper.toDomain(row);
  }

  /**
   * Acquires a row lock (`FOR UPDATE`) inside an active transaction.
   * Prevents race conditions during hold releases or cancellations.
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
      throw new Error('findByIdForUpdate requires an active transaction context.');
    }

    const row = await options.transaction('account_holds')
      .where({ id, tenant_id: tenantId })
      .forUpdate()
      .first();

    return HoldMapper.toDomain(row);
  }

  /**
   * Fetches non-expired active holds for an account to perform available balance calculations.
   * 
   * @param {string} tenantId 
   * @param {string} accountId 
   * @param {Object} [options]
   * @param {import('knex').Knex.Transaction} [options.transaction]
   * @returns {Promise<Array<Object>>}
   */
  async findActiveByAccountId(tenantId, accountId, options = {}) {
    if (!tenantId) throw new Error('Tenant context (tenantId) is required.');
    if (!accountId) throw new Error('Account ID is required.');

    const client = options.transaction || db;
    const now = new Date();

    const rows = await client('account_holds')
      .where({ tenant_id: tenantId, account_id: accountId, status: 'PENDING' })
      .where(function () {
        this.whereNull('expires_at').orWhere('expires_at', '>', now);
      })
      .orderBy('created_at', 'asc');

    return rows.map((row) => HoldMapper.toDomain(row));
  }
}

module.exports = PostgresHoldRepository;