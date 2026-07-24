/**
 * @file src/Security/domain/AuthContext.js
 * @description Domain Value Object encapsulating execution identity, security scope, and tracing for in-flight contexts.
 */

const Actor = require('./Actor');
const ApiClient = require('./ApiClient');

class AuthContext {
  /**
   * @param {Object} params
   * @param {Actor|null} [params.actor=null] - Authenticated human user or user principal
   * @param {ApiClient|null} [params.apiClient=null] - Authenticated M2M client application
   * @param {string|null} [params.correlationId=null] - Distributed tracing identifier (X-Correlation-ID)
   * @param {string|null} [params.clientIp=null] - Origin IP address of incoming request
   * @param {Date|string|null} [params.authenticatedAt=null] - Authentication timestamp
   */
  constructor({
    actor = null,
    apiClient = null,
    correlationId = null,
    clientIp = null,
    authenticatedAt = null,
  } = {}) {
    this.actor = actor instanceof Actor ? actor : null;
    this.apiClient = apiClient instanceof ApiClient ? apiClient : null;
    this.correlationId = correlationId ? String(correlationId).trim() : null;
    this.clientIp = clientIp ? String(clientIp).trim() : null;
    this.authenticatedAt = authenticatedAt ? new Date(authenticatedAt) : new Date();

    // 1. Enforce IP Whitelist boundary if M2M ApiClient is present
    if (this.apiClient && this.clientIp && !this.apiClient.isIpAllowed(this.clientIp)) {
      throw new Error(`[AuthContext] Client IP '${this.clientIp}' is not permitted for API Client '${this.apiClient.clientId}'.`);
    }

    // 2. Validate Tenant Alignment between User Actor and M2M ApiClient
    if (this.actor?.tenantId && this.apiClient?.tenantId) {
      if (String(this.actor.tenantId) !== String(this.apiClient.tenantId)) {
        throw new Error(
          `[AuthContext] Tenant mismatch between Actor (${this.actor.tenantId}) and ApiClient (${this.apiClient.tenantId}).`
        );
      }
    }

    Object.freeze(this);
  }

  /**
   * Creates an anonymous/unauthenticated security context.
   * @param {string|null} [correlationId=null]
   * @returns {AuthContext}
   */
  static anonymous(correlationId = null) {
    return new AuthContext({ correlationId });
  }

  /**
   * Factory method creating an internal system execution context with global platform permissions.
   * @param {string|null} [correlationId=null]
   * @param {Array<string>} [systemPermissions=['*']] - Explicit system scopes
   * @returns {AuthContext}
   */
  static createSystemContext(correlationId = null, systemPermissions = ['*']) {
    const systemActor = new Actor({
      id: 'SYSTEM_INTERNAL',
      isSystem: true,
      directPermissions: systemPermissions,
    });
    return new AuthContext({ actor: systemActor, correlationId });
  }

  /**
   * Returns true if either a valid user actor or active M2M client is attached.
   * @returns {boolean}
   */
  isAuthenticated() {
    if (this.actor) return true;
    if (this.apiClient) return this.apiClient.isValid();
    return false;
  }

  /**
   * Resolves the effective tenant ID for the current context.
   * @returns {string|null}
   */
  getTenantId() {
    return this.actor?.tenantId || this.apiClient?.tenantId || null;
  }

  /**
   * Evaluates if the current context has a specific permission or scope granted.
   * Applies **least-privilege scope intersection** when both actor and apiClient are present.
   *
   * @param {string} scope - Required target permission/scope (e.g. 'payments:write')
   * @returns {boolean}
   */
  hasAccess(scope) {
    if (!this.isAuthenticated()) return false;

    // Delegated scenario: Both Actor and ApiClient are attached (Least Privilege)
    if (this.actor && this.apiClient) {
      return this.actor.can(scope) && this.apiClient.hasScope(scope);
    }

    // Single Identity Scenarios
    if (this.actor) {
      return this.actor.can(scope);
    }

    if (this.apiClient) {
      return this.apiClient.hasScope(scope);
    }

    return false;
  }

  /**
   * Exposes unified principal claims suitable for passing to AuthorizationService.
   * @returns {Object}
   */
  toPrincipal() {
    if (this.actor) {
      return this.actor.toClaims();
    }

    if (this.apiClient) {
      return this.apiClient.toClaims();
    }

    return {
      userId: 'ANONYMOUS',
      tenantId: null,
      roles: [],
      permissions: [],
    };
  }

  /**
   * Serializes context state for structured logging or telemetry context propagation.
   */
  toJSON() {
    return {
      isAuthenticated: this.isAuthenticated(),
      principalId: this.actor?.id || (this.apiClient ? `m2m:${this.apiClient.clientId}` : 'ANONYMOUS'),
      tenantId: this.getTenantId(),
      correlationId: this.correlationId,
      clientIp: this.clientIp,
      authenticatedAt: this.authenticatedAt.toISOString(),
      actor: this.actor ? this.actor.toJSON() : null,
      apiClient: this.apiClient ? this.apiClient.toJSON() : null,
    };
  }
}

module.exports = AuthContext;