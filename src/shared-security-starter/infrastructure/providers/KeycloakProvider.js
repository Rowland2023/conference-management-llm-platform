/**
 * @file src/Security/infrastructure/providers/KeycloakProvider.js
 * @description Anti-Corruption Layer (ACL) translating Keycloak OIDC JWT claims into domain Actor entities.
 */

const Actor = require('../../domain/Actor');
const Role = require('../../domain/Role');
const Permission = require('../../domain/Permission');

class KeycloakProvider {
  /**
   * Internal Keycloak roles that should be filtered out from domain authorization logic.
   * @private
   */
  static IGNORED_REALM_ROLES = new Set([
    'default-roles-realm',
    'offline_access',
    'uma_authorization',
    'account',
  ]);

  /**
   * Standard OIDC protocol scopes to filter out from domain business permissions.
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
   * @param {string} [options.clientId] - Target Keycloak client_id to extract scoped roles from
   * @param {string} [options.customTenantClaim='tenant_id'] - JWT claim path for tenant isolation
   */
  constructor({ clientId = null, customTenantClaim = 'tenant_id' } = {}) {
    this.clientId = clientId;
    this.customTenantClaim = customTenantClaim;
  }

  /**
   * Normalizes raw Keycloak token claims into an immutable DTO.
   *
   * @param {Object} tokenClaims
   * @returns {Object} Normalized principal payload
   */
  parseTokenClaims(tokenClaims) {
    if (!tokenClaims || typeof tokenClaims !== 'object') {
      throw new Error('[KeycloakProvider] Token claims must be a valid non-null object.');
    }

    const isServiceAccount = Boolean(
      tokenClaims.preferred_username?.startsWith('service-account-') ||
      (tokenClaims.azp && !tokenClaims.email)
    );

    // 1. Extract & Sanitize Realm Roles
    const rawRealmRoles = Array.isArray(tokenClaims.realm_access?.roles)
      ? tokenClaims.realm_access.roles
      : [];
    const realmRoles = rawRealmRoles.filter((r) => !KeycloakProvider.IGNORED_REALM_ROLES.has(r));

    // 2. Extract Client/Resource Scoped Roles
    const resourceRoles = [];
    if (tokenClaims.resource_access && typeof tokenClaims.resource_access === 'object') {
      for (const [clientKey, clientObj] of Object.entries(tokenClaims.resource_access)) {
        // If clientId is locked, prioritize matching client roles
        if (Array.isArray(clientObj?.roles)) {
          const formatted = clientObj.roles.map((r) => `${clientKey}:${r}`);
          resourceRoles.push(...formatted);
        }
      }
    }

    // 3. Extract Fine-Grained Permissions (Keycloak UMA or custom claim mappers)
    const customPermissions = [];
    
    // Support Keycloak Authorization Services (UMA) permissions array
    if (Array.isArray(tokenClaims.authorization?.permissions)) {
      for (const p of tokenClaims.authorization.permissions) {
        if (p.rsname && Array.isArray(p.scopes)) {
          p.scopes.forEach((s) => customPermissions.push(`${p.rsname}:${s}`));
        } else if (p.rsname) {
          customPermissions.push(p.rsname);
        }
      }
    }

    // Extract explicit domain permissions claim if mapped by Keycloak protocol mapper
    if (Array.isArray(tokenClaims.permissions)) {
      customPermissions.push(...tokenClaims.permissions);
    }

    // 4. Sanitize OIDC Protocol Scopes from Business Permissions
    const rawScopes = typeof tokenClaims.scope === 'string' ? tokenClaims.scope.split(' ') : [];
    const domainScopes = rawScopes.filter((s) => !KeycloakProvider.OIDC_PROTOCOL_SCOPES.has(s.toLowerCase()));

    // 5. Tenant Extraction
    const tenantId = tokenClaims[this.customTenantClaim] || 
                     tokenClaims.tenant_id || 
                     tokenClaims.organization || 
                     null;

    const allRoles = Array.from(new Set([...realmRoles, ...resourceRoles]));
    const allPermissions = Array.from(new Set([...customPermissions, ...domainScopes]));

    return {
      userId: tokenClaims.sub,
      clientId: tokenClaims.azp || tokenClaims.client_id || null,
      email: tokenClaims.email ? tokenClaims.email.trim().toLowerCase() : null,
      username: tokenClaims.preferred_username || null,
      isServiceAccount,
      tenantId: tenantId ? String(tenantId) : null,
      roles: allRoles,
      permissions: allPermissions,
      provider: 'keycloak',
    };
  }

  /**
   * Factory method converting Keycloak JWT claims directly into an Actor domain entity.
   *
   * @param {Object} tokenClaims - Decoded Keycloak JWT payload
   * @returns {Actor} Reconstructed Actor entity
   */
  toActor(tokenClaims) {
    const claims = this.parseTokenClaims(tokenClaims);

    // Map strings to Domain Role Entities
    const domainRoles = claims.roles.map((roleName) => new Role({ name: roleName }));

    // Map permission scope strings to Permission Value Objects
    const directPermissions = claims.permissions.map((p) => new Permission(p));

    return new Actor({
      id: claims.userId,
      email: claims.email,
      tenantId: claims.tenantId,
      roles: domainRoles,
      directPermissions,
      isSystem: claims.isServiceAccount,
      metadata: {
        provider: 'keycloak',
        username: claims.username,
        clientId: claims.clientId,
      },
    });
  }
}

module.exports = KeycloakProvider;