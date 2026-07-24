/**
 * @file src/Security/infrastructure/providers/Auth0Provider.js
 * @description Anti-Corruption Layer (ACL) translating Auth0 OIDC/JWT claims into domain Actor entities.
 */

const Actor = require('../../domain/Actor');
const Role = require('../../domain/Role');
const Permission = require('../../domain/Permission');

class Auth0Provider {
  /**
   * Standard OIDC protocol scopes to filter out from domain permissions.
   * @private
   */
  static OIDC_PROTOCOL_SCOPES = new Set([
    'openid',
    'profile',
    'email',
    'address',
    'phone',
    'offline_access',
  ]);

  /**
   * @param {Object} [options]
   * @param {string} [options.customNamespace='https://api.domain.com/'] - Auth0 custom claim URI namespace
   */
  constructor({ customNamespace = 'https://api.domain.com/' } = {}) {
    // Ensure trailing slash on URI namespace
    this.customNamespace = customNamespace.endsWith('/')
      ? customNamespace
      : `${customNamespace}/`;
  }

  /**
   * Normalizes raw Auth0 token claims into a standardized payload DTO.
   *
   * @param {Object} tokenClaims - Decoded JWT payload
   * @returns {Object} Normalized identity payload
   */
  parseTokenClaims(tokenClaims) {
    if (!tokenClaims || typeof tokenClaims !== 'object') {
      throw new Error('[Auth0Provider] Token claims must be a valid non-null object.');
    }

    const rolesKey = `${this.customNamespace}roles`;
    const permissionsKey = `${this.customNamespace}permissions`;
    const tenantKey = `${this.customNamespace}tenant_id`;

    // Detect M2M Client Credentials grant
    const isM2MClient = Boolean(
      tokenClaims.gty === 'client-credentials' ||
      (typeof tokenClaims.sub === 'string' && tokenClaims.sub.endsWith('@clients'))
    );

    // 1. Extract & Validate Roles (Prioritize namespaced custom action claims)
    const rawRoles = Array.isArray(tokenClaims[rolesKey])
      ? tokenClaims[rolesKey]
      : Array.isArray(tokenClaims.roles)
        ? tokenClaims.roles
        : [];

    // 2. Extract & Validate Permissions (Auth0 RBAC permissions array vs Custom Namespace)
    let rawPermissions = [];
    if (Array.isArray(tokenClaims[permissionsKey])) {
      rawPermissions = tokenClaims[permissionsKey];
    } else if (Array.isArray(tokenClaims.permissions)) {
      rawPermissions = tokenClaims.permissions;
    } else if (typeof tokenClaims.scope === 'string') {
      // Split scope string and filter out standard OIDC protocol scopes
      rawPermissions = tokenClaims.scope
        .split(' ')
        .filter((s) => !Auth0Provider.OIDC_PROTOCOL_SCOPES.has(s.toLowerCase()));
    }

    // 3. Resolve Tenant / Organization (Auth0 native org_id vs custom namespace)
    const tenantId = tokenClaims[tenantKey] || tokenClaims.org_id || null;

    // Deduplicate roles and permissions
    const roles = Array.from(new Set(rawRoles.map((r) => String(r).trim())));
    const permissions = Array.from(new Set(rawPermissions.map((p) => String(p).trim())));

    return {
      userId: tokenClaims.sub,
      clientId: tokenClaims.azp || (isM2MClient ? tokenClaims.sub.replace('@clients', '') : null),
      email: tokenClaims.email ? tokenClaims.email.trim().toLowerCase() : null,
      emailVerified: Boolean(tokenClaims.email_verified),
      isM2MClient,
      tenantId: tenantId ? String(tenantId) : null,
      roles,
      permissions,
      provider: 'auth0',
    };
  }

  /**
   * Factory method converting Auth0 JWT claims directly into an Actor domain aggregate entity.
   *
   * @param {Object} tokenClaims - Decoded Auth0 JWT claims
   * @returns {Actor} Reconstructed Actor entity
   */
  toActor(tokenClaims) {
    const claims = this.parseTokenClaims(tokenClaims);

    // Instantiate Domain Role Entities
    const domainRoles = claims.roles.map((roleName) => new Role({ name: roleName }));

    // Instantiate Domain Permission Value Objects
    const directPermissions = claims.permissions.map((p) => new Permission(p));

    return new Actor({
      id: claims.userId,
      email: claims.email,
      tenantId: claims.tenantId,
      roles: domainRoles,
      directPermissions,
      isSystem: claims.isM2MClient,
      metadata: {
        provider: 'auth0',
        clientId: claims.clientId,
        emailVerified: claims.emailVerified,
      },
    });
  }
}

module.exports = Auth0Provider;