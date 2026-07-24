/**
 * @file src/Security/infrastructure/providers/CognitoProvider.js
 * @description Anti-Corruption Layer (ACL) translating AWS Cognito User Pool claims into domain Actor entities.
 */

const Actor = require('../../domain/Actor');
const Role = require('../../domain/Role');
const Permission = require('../../domain/Permission');

class CognitoProvider {
  /**
   * Cognito protocol and standard OIDC scopes to sanitize out of domain business permissions.
   * @private
   */
  static COGNITO_PROTOCOL_SCOPES = new Set([
    'openid',
    'email',
    'phone',
    'profile',
    'aws.cognito.signin.user.admin',
  ]);

  /**
   * @param {Object} [options]
   * @param {string} [options.tenantClaim='custom:tenant_id'] - Custom user attribute claim path for tenant isolation
   * @param {string} [options.userPoolId=null] - Expected AWS Cognito User Pool ID
   */
  constructor({ tenantClaim = 'custom:tenant_id', userPoolId = null } = {}) {
    this.tenantClaim = tenantClaim;
    this.userPoolId = userPoolId;
  }

  /**
   * Normalizes AWS Cognito JWT claims (handling both ID Tokens and Access Tokens).
   *
   * @param {Object} tokenClaims - Decoded JWT payload
   * @returns {Object} Standardized identity payload DTO
   */
  parseTokenClaims(tokenClaims) {
    if (!tokenClaims || typeof tokenClaims !== 'object') {
      throw new Error('[CognitoProvider] Token claims must be a valid non-null object.');
    }

    const tokenUse = tokenClaims.token_use || 'access'; // 'id' or 'access'
    const isM2MClient = Boolean(
      tokenClaims.client_id && (!tokenClaims['cognito:username'] && !tokenClaims.email)
    );

    // 1. Extract Groups/Roles (Cognito stores user groups in `cognito:groups`)
    const rawGroups = Array.isArray(tokenClaims['cognito:groups'])
      ? tokenClaims['cognito:groups']
      : [];

    // 2. Extract & Sanitize Permissions/Scopes
    let rawPermissions = [];
    if (typeof tokenClaims.scope === 'string') {
      rawPermissions = tokenClaims.scope
        .split(' ')
        .filter((s) => !CognitoProvider.COGNITO_PROTOCOL_SCOPES.has(s.toLowerCase()));
    }

    // Support custom permissions array if mapped via Cognito custom attribute or Lambda trigger
    if (Array.isArray(tokenClaims['custom:permissions'])) {
      rawPermissions.push(...tokenClaims['custom:permissions']);
    }

    // 3. Extract Tenant ID from Custom Attribute
    const tenantId = tokenClaims[this.tenantClaim] || 
                     tokenClaims['custom:tenant_id'] || 
                     tokenClaims['custom:organization'] || 
                     null;

    // Deduplicate roles and permissions
    const roles = Array.from(new Set(rawGroups.map((g) => String(g).trim())));
    const permissions = Array.from(new Set(rawPermissions.map((p) => String(p).trim())));

    return {
      userId: tokenClaims.sub,
      clientId: tokenClaims.client_id || tokenClaims.aud || null,
      username: tokenClaims['cognito:username'] || tokenClaims.username || null,
      email: tokenClaims.email ? tokenClaims.email.trim().toLowerCase() : null,
      emailVerified: Boolean(tokenClaims.email_verified),
      tokenUse,
      isM2MClient,
      tenantId: tenantId ? String(tenantId) : null,
      roles,
      permissions,
      provider: 'cognito',
    };
  }

  /**
   * Factory method converting Cognito JWT claims directly into an Actor domain aggregate entity.
   *
   * @param {Object} tokenClaims - Decoded Cognito JWT claims
   * @returns {Actor} Reconstructed Actor entity
   */
  toActor(tokenClaims) {
    const claims = this.parseTokenClaims(tokenClaims);

    // Instantiate Domain Role Entities from Cognito Groups
    const domainRoles = claims.roles.map((groupName) => new Role({ name: groupName }));

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
        provider: 'cognito',
        tokenUse: claims.tokenUse,
        username: claims.username,
        clientId: claims.clientId,
        emailVerified: claims.emailVerified,
      },
    });
  }
}

module.exports = CognitoProvider;