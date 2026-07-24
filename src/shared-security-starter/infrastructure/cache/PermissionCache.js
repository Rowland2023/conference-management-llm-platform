/**
 * @file src/Security/infrastructure/cache/PermissionCache.js
 * @description Hardened, fault-tolerant Redis cache for high-throughput permission evaluation.
 */

class PermissionCache {
  /**
   * @param {Object} params
   * @param {Object} params.redisClient - ioredis or node-redis client instance
   * @param {number} [params.ttlSeconds=300] - Cache retention window (default 5 min)
   * @param {string} [params.keyPrefix='sec:perm:'] - Redis key namespace
   * @param {Object} [params.logger=null] - Operational logger
   */
  constructor({ redisClient, ttlSeconds = 300, keyPrefix = 'sec:perm:', logger = null }) {
    if (!redisClient) {
      throw new Error('[PermissionCache] Redis client is required.');
    }
    this.redis = redisClient;
    this.ttlSeconds = Number.isInteger(ttlSeconds) ? ttlSeconds : 300;
    this.keyPrefix = keyPrefix;
    this.logger = logger;
  }

  /**
   * Generates a tenant-isolated Redis cache key.
   * @private
   */
  _getKey(userId, tenantId = null) {
    if (!userId) {
      throw new Error('[PermissionCache] User ID is required to construct cache key.');
    }
    const tenantNamespace = tenantId ? `t:${tenantId}:` : 'global:';
    return `${this.keyPrefix}${tenantNamespace}u:${userId}`;
  }

  /**
   * Retrieves cached permissions for a principal within a tenant context.
   * Degrades gracefully to `null` on Redis operational failure (cache miss fallback).
   *
   * @param {string} userId
   * @param {string|null} [tenantId=null]
   * @returns {Promise<Array<string>|null>} Array of permission scope strings or null
   */
  async get(userId, tenantId = null) {
    try {
      const key = this._getKey(userId, tenantId);
      const cached = await this.redis.get(key);
      
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? parsed : null;
    } catch (err) {
      if (this.logger) {
        this.logger.warn(`[PermissionCache] Redis GET error for user '${userId}': ${err.message}`);
      }
      // Fail-safe: Return null so caller falls back to primary storage/db evaluation
      return null;
    }
  }

  /**
   * Caches evaluated permissions with TTL. Supports both ioredis and node-redis syntax.
   *
   * @param {string} userId
   * @param {Array<string>} permissions - List of granted permission scopes
   * @param {string|null} [tenantId=null]
   * @returns {Promise<void>}
   */
  async set(userId, permissions = [], tenantId = null) {
    if (!Array.isArray(permissions)) return;

    try {
      const key = this._getKey(userId, tenantId);
      const payload = JSON.stringify(permissions);

      // Support driver variations (ioredis positional vs node-redis options object)
      if (typeof this.redis.setex === 'function') {
        await this.redis.setex(key, this.ttlSeconds, payload);
      } else {
        await this.redis.set(key, payload, { EX: this.ttlSeconds });
      }
    } catch (err) {
      if (this.logger) {
        this.logger.error(`[PermissionCache] Redis SET error for user '${userId}': ${err.message}`);
      }
      // Non-blocking: Do not break the request flow if write-cache fails
    }
  }

  /**
   * Invalidates cached permissions for a user upon privilege mutation or role assignment.
   *
   * @param {string} userId
   * @param {string|null} [tenantId=null]
   * @returns {Promise<void>}
   */
  async invalidate(userId, tenantId = null) {
    try {
      const key = this._getKey(userId, tenantId);
      await this.redis.del(key);
    } catch (err) {
      if (this.logger) {
        this.logger.error(`[PermissionCache] Redis DEL error for user '${userId}': ${err.message}`);
      }
    }
  }

  /**
   * Clears all tenant permissions for a user across all tenant boundaries (Wildcard Del).
   *
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async invalidateAllTenants(userId) {
    try {
      const pattern = `${this.keyPrefix}*u:${userId}`;
      
      if (typeof this.redis.scanStream === 'function') {
        // ioredis non-blocking stream scan
        const stream = this.redis.scanStream({ match: pattern, count: 100 });
        stream.on('data', async (keys = []) => {
          if (keys.length > 0) {
            const pipeline = this.redis.pipeline();
            keys.forEach((key) => pipeline.del(key));
            await pipeline.exec();
          }
        });
      } else {
        // Fallback or node-redis scan
        const key = this._getKey(userId, null);
        await this.redis.del(key);
      }
    } catch (err) {
      if (this.logger) {
        this.logger.error(`[PermissionCache] Bulk invalidation error for user '${userId}': ${err.message}`);
      }
    }
  }
}

module.exports = PermissionCache;