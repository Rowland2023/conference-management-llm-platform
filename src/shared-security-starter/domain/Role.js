/**
 * @file src/Security/domain/Role.js
 * @description Domain Entity representing a security role (e.g., "FINANCE_ADMIN").
 */

const Permission = require('./Permission');

class Role {
  /**
   * Valid role identifier: uppercase alphanumeric and underscores only.
   * @private
   */
  static NAME_REGEX = /^[A-Z0-9_]{3,64}$/;

  /**
   * @param {Object} params
   * @param {string} params.name - Role identifier (e.g., "FINANCE_OPERATOR")
   * @param {Array<Permission|string>} [params.permissions=[]] - Associated permissions
   * @param {string} [params.description=''] - Optional description
   * @param {string|null} [params.tenantId=null] - Optional tenant scoping
   */
  constructor({ name, permissions = [], description = '', tenantId = null }) {
    if (!name || typeof name !== 'string') {
      throw new Error('[Role] Role name is required and must be a string.');
    }

    const normalizedName = name.trim().toUpperCase();
    if (!Role.NAME_REGEX.test(normalizedName)) {
      throw new Error(
        `[Role] Invalid role name '${normalizedName}'. Must be 3-64 characters matching [A-Z0-9_].`
      );
    }

    this.name = normalizedName;
    this.description = typeof description === 'string' ? description.trim() : '';
    this.tenantId = tenantId ? String(tenantId).trim() : null;

    // Internal Map keyed by scope string to ensure true Value Object uniqueness
    this._permissionsMap = new Map();

    // Populate initial permissions safely
    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        this.addPermission(p);
      }
    }
  }

  /**
   * Ensures value object instance conversion.
   * @private
   */
  _ensurePermission(permission) {
    if (permission instanceof Permission) {
      return permission;
    }
    return new Permission(permission);
  }

  /**
   * Adds a permission to this role if not already present.
   * @param {Permission|string} permission
   * @returns {Role} Returns self for fluent chaining
   */
  addPermission(permission) {
    const permInstance = this._ensurePermission(permission);
    this._permissionsMap.set(permInstance.scope, permInstance);
    return this;
  }

  /**
   * Adds multiple permissions in a single operation.
   * @param {Array<Permission|string>} permissions
   * @returns {Role}
   */
  addPermissions(permissions = []) {
    if (Array.isArray(permissions)) {
      for (const p of permissions) {
        this.addPermission(p);
      }
    }
    return this;
  }

  /**
   * Removes a permission by scope or Permission instance.
   * @param {string|Permission} permission
   * @returns {boolean} True if removed, false if not found
   */
  removePermission(permission) {
    const scope = permission instanceof Permission
      ? permission.scope
      : String(permission).trim().toLowerCase();

    return this._permissionsMap.delete(scope);
  }

  /**
   * Checks if this role grants a target permission (including wildcard matches).
   * @param {string|Permission} requiredPermission
   * @returns {boolean}
   */
  hasPermission(requiredPermission) {
    const target = this._ensurePermission(requiredPermission);

    for (const perm of this._permissionsMap.values()) {
      if (perm.matches(target)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Gets an array of immutable Permission Value Objects.
   * @returns {Array<Permission>}
   */
  getPermissions() {
    return Array.from(this._permissionsMap.values());
  }

  /**
   * Gets a flattened array of permission scope strings.
   * @returns {Array<string>}
   */
  getPermissionScopes() {
    return Array.from(this._permissionsMap.keys());
  }

  /**
   * Domain entity equality check based on unique role name and tenant scope.
   * @param {unknown} other
   * @returns {boolean}
   */
  equals(other) {
    return (
      other instanceof Role &&
      other.name === this.name &&
      other.tenantId === this.tenantId
    );
  }

  /**
   * Serializes entity to a plain JavaScript object for persistence repositories or DTOs.
   */
  toJSON() {
    return {
      name: this.name,
      description: this.description,
      tenantId: this.tenantId,
      permissions: this.getPermissionScopes(),
    };
  }
}

module.exports = Role;