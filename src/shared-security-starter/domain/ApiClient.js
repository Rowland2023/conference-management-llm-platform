/**
 * @file src/Security/domain/ApiClient.js
 * @description Domain entity modeling Machine-to-Machine (M2M) API Clients and system integrations.
 */

const Permission = require('./Permission');

class ApiClient {
  /**
   * @param {Object} params
   * @param {string} params.clientId - Public client identifier (e.g., "client_live_8f92a0")
   * @param {string} params.name - Descriptive application/partner name
   * @param {string} [params.tenantId=null] - Tenant/organization boundary key
   * @param {Array<Permission|string>} [params.allowedScopes=[]] - Whitelisted permission scopes
   * @param {Array<string>} [params.ipWhitelist=[]] - Allowed CIDR or IP addresses
   * @param {number} [params.rateLimitPerMin=1000] - Rate limiting threshold
   * @param {boolean} [params.isActive=true] - Active flag
   * @param {Date|string|number|null} [params.expiresAt=null] - Credential expiration timestamp
   * @param {Object} [params.metadata={}] - Custom integration metadata
   */
  constructor({
    clientId,
    name,
    tenantId = null,
    allowedScopes = [],
    ipWhitelist = [],
    rateLimitPerMin = 1000,
    isActive = true,
    expiresAt = null,
    metadata = {},
  }) {
    if (!clientId || typeof clientId !== 'string' || !clientId.trim()) {
      throw new Error('[ApiClient] Client ID is required and must be a non-empty string.');
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new Error('[ApiClient] Client name is required.');
    }

    this.clientId = clientId.trim();
    this.name = name.trim();
    this.tenantId = tenantId ? String(tenantId).trim() : null;
    this.ipWhitelist = Array.isArray(ipWhitelist) ? ipWhitelist.map((ip) => ip.trim()) : [];
    this.rateLimitPerMin = Number.isInteger(rateLimitPerMin) && rateLimitPerMin > 0 ? rateLimitPerMin : 1000;
    this.isActive = Boolean(isActive);
    this.expiresAt = this._parseExpirationDate(expiresAt);
    this.metadata = metadata || {};

    // Internal Map keyed by scope string using Permission Value Objects
    this._allowedScopesMap = new Map();
    if (Array.isArray(allowedScopes)) {
      for (const scope of allowedScopes) {
        const perm = scope instanceof Permission ? scope : new Permission(scope);
        this._allowedScopesMap.set(perm.scope, perm);
      }
    }
  }

  /**
   * Safely parses and validates expiration date to prevent NaN comparison bypasses.
   * @private
   */
  _parseExpirationDate(expiresAt) {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    if (isNaN(date.getTime())) {
      throw new Error(`[ApiClient] Invalid expiration date provided: '${expiresAt}'.`);
    }
    return date;
  }

  /**
   * Evaluates whether the API Client credential is currently active and not expired.
   * @returns {boolean}
   */
  isValid() {
    if (!this.isActive) return false;
    if (this.expiresAt && this.expiresAt.getTime() <= Date.now()) return false;
    return true;
  }

  /**
   * Validates if the client IP is permitted according to the whitelist.
   * @param {string} ipAddress
   * @returns {boolean}
   */
  isIpAllowed(ipAddress) {
    if (!this.ipWhitelist || this.ipWhitelist.length === 0) {
      return true; // No IP restrictions configured
    }
    if (!ipAddress) return false;
    return this.ipWhitelist.includes(ipAddress.trim());
  }

  /**
   * Checks if this client possesses a required API scope using segment-aware wildcard matching.
   * e.g., 'payments:*' grants 'payments:read' and 'payments:transfers:write'
   *
   * @param {string|Permission} targetScope
   * @returns {boolean}
   */
  hasScope(targetScope) {
    if (!this.isValid()) return false;

    const target = targetScope instanceof Permission
      ? targetScope
      : new Permission(targetScope);

    for (const perm of this._allowedScopesMap.values()) {
      if (perm.matches(target)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Converts the API Client entity into an Actor-compatible principal claims object
   * for seamless integration with AuthorizationService.
   */
  toClaims() {
    return {
      userId: `m2m:${this.clientId}`,
      clientId: this.clientId,
      tenantId: this.tenantId,
      isSystem: true,
      roles: ['M2M_CLIENT'],
      permissions: Array.from(this._allowedScopesMap.keys()),
    };
  }

  /**
   * Serializes entity state for persistence or data transfer.
   */
  toJSON() {
    return {
      clientId: this.clientId,
      name: this.name,
      tenantId: this.tenantId,
      ipWhitelist: this.ipWhitelist,
      rateLimitPerMin: this.rateLimitPerMin,
      isActive: this.isActive,
      expiresAt: this.expiresAt ? this.expiresAt.toISOString() : null,
      allowedScopes: Array.from(this._allowedScopesMap.keys()),
      metadata: this.metadata,
    };
  }
}

module.exports = ApiClient;