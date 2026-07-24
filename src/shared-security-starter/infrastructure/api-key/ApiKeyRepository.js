/**
 * @file src/Security/infrastructure/api-key/ApiKeyRepository.js
 * @description Persistence repository mapping SQL database records to ApiClient domain entities.
 */

const crypto = require('crypto');
const ApiClient = require('../../domain/ApiClient');

class ApiKeyRepository {
  /**
   * @param {Object} params
   * @param {import('knex').Knex} params.knex - Database connection instance
   * @param {string} [params.tableName='api_keys'] - Target DB table name
   */
  constructor({ knex, tableName = 'api_keys' }) {
    if (!knex) {
      throw new Error('[ApiKeyRepository] Knex database instance is required.');
    }
    this.knex = knex;
    this.tableName = tableName;
  }

  /**
   * Safe JSON parsing helper supporting both driver auto-parsing (PostgreSQL) 
   * and raw JSON string columns (MySQL/SQLite).
   * @private
   */
  _parseJsonField(fieldValue, fallback) {
    if (!fieldValue) return fallback;
    if (typeof fieldValue === 'object') return fieldValue;
    try {
      return JSON.parse(fieldValue);
    } catch {
      return fallback;
    }
  }

  /**
   * Maps a raw SQL database row to an ApiClient domain entity.
   * @private
   * @param {Object} record
   * @returns {ApiClient}
   */
  _toDomainEntity(record) {
    const allowedScopes = this._parseJsonField(record.scopes, []);
    const ipWhitelist = this._parseJsonField(record.ip_whitelist, []);
    const metadata = this._parseJsonField(record.metadata, {});

    return new ApiClient({
      clientId: record.client_id,
      name: record.name || `Client-${record.client_id}`,
      tenantId: record.tenant_id,
      allowedScopes,
      ipWhitelist,
      rateLimitPerMin: record.rate_limit_per_min || 1000,
      isActive: !record.is_revoked && record.is_active !== false,
      expiresAt: record.expires_at ? new Date(record.expires_at) : null,
      metadata,
    });
  }

  /**
   * Looks up an active, unrevoked API Key record by its computed hash.
   *
   * @param {string} keyHash - SHA-256 / HMAC hash of incoming raw API key
   * @param {string|null} [tenantId=null] - Optional tenant boundary check
   * @returns {Promise<ApiClient|null>} Reconstructed ApiClient domain entity
   */
  async findByHash(keyHash, tenantId = null) {
    if (!keyHash || typeof keyHash !== 'string') {
      return null;
    }

    let query = this.knex(this.tableName)
      .where({ key_hash: keyHash, is_revoked: false })
      .first();

    if (tenantId) {
      query = query.andWhere({ tenant_id: tenantId });
    }

    const record = await query;
    if (!record) return null;

    return this._toDomainEntity(record);
  }

  /**
   * Stores or updates an API Key and its associated ApiClient domain state.
   *
   * @param {ApiClient} clientEntity - Domain entity instance
   * @param {string} keyHash - Hashed API key string
   * @param {string} [rawKeyPrefix='sk_live'] - Key prefix identifier (e.g. "sk_live_9f83")
   * @returns {Promise<void>}
   */
  async save(clientEntity, keyHash, rawKeyPrefix = '') {
    if (!(clientEntity instanceof ApiClient)) {
      throw new Error('[ApiKeyRepository] Must pass a valid ApiClient instance to save.');
    }

    if (!keyHash || typeof keyHash !== 'string') {
      throw new Error('[ApiKeyRepository] Valid keyHash is required for persistence.');
    }

    const now = new Date();
    const payload = {
      client_id: clientEntity.clientId,
      tenant_id: clientEntity.tenantId,
      name: clientEntity.name,
      key_hash: keyHash,
      key_prefix: rawKeyPrefix,
      scopes: JSON.stringify(clientEntity._allowedScopesMap ? Array.from(clientEntity._allowedScopesMap.keys()) : []),
      ip_whitelist: JSON.stringify(clientEntity.ipWhitelist),
      rate_limit_per_min: clientEntity.rateLimitPerMin,
      is_active: clientEntity.isActive,
      is_revoked: !clientEntity.isActive,
      expires_at: clientEntity.expiresAt ? clientEntity.expiresAt.toISOString() : null,
      metadata: JSON.stringify(clientEntity.metadata),
      updated_at: now,
    };

    // Upsert key record
    const existing = await this.knex(this.tableName)
      .where({ client_id: clientEntity.clientId })
      .first();

    if (existing) {
      await this.knex(this.tableName)
        .where({ client_id: clientEntity.clientId })
        .update(payload);
    } else {
      await this.knex(this.tableName).insert({
        id: crypto.randomUUID(),
        ...payload,
        created_at: now,
      });
    }
  }

  /**
   * Atomic operational trigger updating last usage timestamp without locking rows.
   *
   * @param {string} clientId
   * @param {string} [clientIp=null]
   * @returns {Promise<void>}
   */
  async touchLastUsed(clientId, clientIp = null) {
    if (!clientId) return;

    await this.knex(this.tableName)
      .where({ client_id: clientId })
      .update({
        last_used_at: new Date(),
        last_ip: clientIp,
      });
  }

  /**
   * Revokes an API Key credential instantly.
   *
   * @param {string} clientId
   * @returns {Promise<boolean>}
   */
  async revoke(clientId) {
    const count = await this.knex(this.tableName)
      .where({ client_id: clientId })
      .update({
        is_revoked: true,
        is_active: false,
        updated_at: new Date(),
      });

    return count > 0;
  }
}

module.exports = ApiKeyRepository;