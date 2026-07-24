/**
 * @file src/Security/domain/Actor.js
 * @description Domain entity representing an authenticated human user or system principal.
 */

const Role = require('./Role');
const Permission = require('./Permission');

class Actor {
  /**
   * @param {Object} params
   * @param {string} params.id - Unique actor identifier (e.g. UUID)
   * @param {string} [params.email=null] - User email
   * @param {string} [params.tenantId=null] - Organization/tenant boundary key
   * @param {Array<Role>} [params.roles=[]] - Assigned Role entities
   * @param {Array<Permission|string>} [params.directPermissions=[]] - Direct permission overrides
   * @param {boolean} [params.isSystem=false] - Flag indicating system process actor
   * @param {Object} [params.metadata={}] - Contextual attributes (IP, device, etc.)
   */
  constructor({
    id,
    email = null,
    tenantId = null,
    roles = [],
    directPermissions = [],
    isSystem = false,
    metadata = {},
  }) {
    // SYSTEM actors receive a deterministic identifier if omitted
    if (!id && !isSystem) {
      throw new Error('[Actor] Actor ID is required for non-system principals.');
    }

    this.id = id || 'SYSTEM_INTERNAL';
    this.email = email ? email.trim().toLowerCase() : null;
    this.tenantId = tenantId ? String(tenantId).trim() : null;
    this.isSystem = Boolean(isSystem);
    this.metadata = metadata || {};

    // Internal Roles Map: keyed by normalized role name
    this._rolesMap = new Map();
    if (Array.isArray(roles)) {
      for (const role of roles) {
        if (role instanceof Role) {
          this._rolesMap.set(role.name, role);
        }
      }
    }

    // Internal Direct Permissions Map: keyed by permission scope
    this._directPermissionsMap = new Map();
    if (Array.isArray(directPermissions)) {
      for (const p of directPermissions) {
        const perm = p instanceof Permission ? p : new Permission(p);
        this._directPermissionsMap.set(perm.scope, perm);
      }
    }
  }

  /**
   * Aggregates direct permissions and role-inherited permissions into a unique list.
   * @returns {Array<Permission>}
   */
  getAllPermissions() {
    const combinedMap = new Map(this._directPermissionsMap);

    for (const role of this._rolesMap.values()) {
      for (const perm of role.getPermissions()) {
        combinedMap.set(perm.scope, perm);
      }
    }

    return Array.from(combinedMap.values());
  }

  /**
   * Gets flattened array of all granted permission scope strings.
   * @returns {Array<string>}
   */
  getAllPermissionScopes() {
    return this.getAllPermissions().map((p) => p.scope);
  }

  /**
   * Evaluates if this actor holds a target permission scope.
   * System actors with explicit system roles evaluate through standard permission rules.
   *
   * @param {string|Permission} targetPermission
   * @returns {boolean}
   */
  can(targetPermission) {
    const target = targetPermission instanceof Permission 
      ? targetPermission 
      : new Permission(targetPermission);

    const permissions = this.getAllPermissions();
    return permissions.some((perm) => perm.matches(target));
  }

  /**
   * Checks if actor possesses a specific role.
   * @param {string} roleName
   * @returns {boolean}
   */
  hasRole(roleName) {
    if (typeof roleName !== 'string') return false;
    return this._rolesMap.has(roleName.toUpperCase().trim());
  }

  /**
   * Enforces strict tenant isolation boundary between this actor and a target resource.
   * @param {Object} resource - Target domain entity carrying tenantId/tenant_id
   * @returns {boolean}
   */
  isSameTenant(resource) {
    if (!resource || typeof resource !== 'object') return false;
    const resourceTenant = resource.tenantId || resource.tenant_id || resource.organizationId;
    
    // Non-tenant resources are globally accessible across tenants
    if (!resourceTenant) return true;

    // Must match actor's tenantId exactly
    return String(this.tenantId) === String(resourceTenant);
  }

  /**
   * Converts Actor entity into a principal claims payload for security context.
   */
  toClaims() {
    return {
      userId: this.id,
      email: this.email,
      tenantId: this.tenantId,
      isSystem: this.isSystem,
      roles: Array.from(this._rolesMap.keys()),
      permissions: this.getAllPermissionScopes(),
    };
  }

  /**
   * Serializes entity state for persistence or transfer.
   */
  toJSON() {
    return {
      id: this.id,
      email: this.email,
      tenantId: this.tenantId,
      isSystem: this.isSystem,
      roles: Array.from(this._rolesMap.values()).map((r) => r.toJSON()),
      directPermissions: Array.from(this._directPermissionsMap.keys()),
      metadata: this.metadata,
    };
  }
}

module.exports = Actor;