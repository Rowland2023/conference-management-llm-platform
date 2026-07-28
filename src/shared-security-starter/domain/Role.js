/**
 * @file src/shared-security-starter/domain/Role.js
 * @description Domain Entity representing a security role (e.g., "FINANCE_ADMIN").
 */

import { Permission } from "./Permission.js";


export class Role {

  /**
   * Valid role identifier: uppercase alphanumeric and underscores only.
   */
  static NAME_REGEX = /^[A-Z0-9_]{3,64}$/;


  constructor({
    name,
    permissions = [],
    description = "",
    tenantId = null
  }) {

    if (
      !name ||
      typeof name !== "string"
    ) {
      throw new Error(
        "[Role] Role name is required and must be a string."
      );
    }


    const normalizedName =
      name.trim().toUpperCase();


    if (!Role.NAME_REGEX.test(normalizedName)) {
      throw new Error(
        `[Role] Invalid role name '${normalizedName}'. Must be 3-64 characters matching [A-Z0-9_].`
      );
    }


    this.name = normalizedName;

    this.description =
      typeof description === "string"
        ? description.trim()
        : "";

    this.tenantId =
      tenantId
        ? String(tenantId).trim()
        : null;



    // Permission Value Objects indexed by scope
    this._permissionsMap = new Map();



    if (Array.isArray(permissions)) {

      for (const permission of permissions) {

        this.addPermission(permission);

      }

    }

  }





  /**
   * Converts string permissions into Permission Value Objects.
   */
  _ensurePermission(permission) {

    if (permission instanceof Permission) {
      return permission;
    }


    return new Permission(permission);

  }





  /**
   * Adds permission.
   */
  addPermission(permission) {

    const permInstance =
      this._ensurePermission(permission);


    this._permissionsMap.set(
      permInstance.scope,
      permInstance
    );


    return this;

  }





  /**
   * Adds multiple permissions.
   */
  addPermissions(permissions = []) {

    if (Array.isArray(permissions)) {

      for (const permission of permissions) {

        this.addPermission(permission);

      }

    }


    return this;

  }





  /**
   * Removes permission.
   */
  removePermission(permission) {

    const scope =
      permission instanceof Permission
        ? permission.scope
        : String(permission)
            .trim()
            .toLowerCase();


    return this._permissionsMap.delete(scope);

  }





  /**
   * Checks whether role grants permission.
   */
  hasPermission(requiredPermission) {

    const target =
      this._ensurePermission(requiredPermission);



    for (const permission of this._permissionsMap.values()) {

      if (permission.matches(target)) {

        return true;

      }

    }


    return false;

  }





  /**
   * Returns Permission Value Objects.
   */
  getPermissions() {

    return Array.from(
      this._permissionsMap.values()
    );

  }





  /**
   * Returns permission scopes.
   */
  getPermissionScopes() {

    return Array.from(
      this._permissionsMap.keys()
    );

  }





  /**
   * Entity equality.
   */
  equals(other) {

    return (
      other instanceof Role &&
      other.name === this.name &&
      other.tenantId === this.tenantId
    );

  }





  /**
   * Serialize entity.
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