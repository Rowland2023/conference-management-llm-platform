/**
 * @file src/shared-security-starter/domain/Actor.js
 * @description Domain entity representing an authenticated human user or system principal.
 */

import { Role } from "./Role.js";
import { Permission } from "./Permission.js";


export class Actor {

  /**
   * @param {Object} params
   * @param {string} params.id - Unique actor identifier
   * @param {string} [params.email=null] - User email
   * @param {string} [params.tenantId=null] - Tenant boundary key
   * @param {Array<Role>} [params.roles=[]] - Assigned roles
   * @param {Array<Permission|string>} [params.directPermissions=[]] - Direct permissions
   * @param {boolean} [params.isSystem=false] - System actor flag
   * @param {Object} [params.metadata={}] - Context metadata
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

    if (!id && !isSystem) {
      throw new Error(
        "[Actor] Actor ID is required for non-system principals."
      );
    }


    this.id = id || "SYSTEM_INTERNAL";

    this.email =
      email
        ? email.trim().toLowerCase()
        : null;


    this.tenantId =
      tenantId
        ? String(tenantId).trim()
        : null;


    this.isSystem = Boolean(isSystem);

    this.metadata = metadata || {};



    // Role registry
    this._rolesMap = new Map();


    if (Array.isArray(roles)) {

      for (const role of roles) {

        if (role instanceof Role) {

          this._rolesMap.set(
            role.name.toUpperCase(),
            role
          );

        }

      }

    }



    // Direct permission registry
    this._directPermissionsMap = new Map();


    if (Array.isArray(directPermissions)) {

      for (const permission of directPermissions) {

        const perm =
          permission instanceof Permission
            ? permission
            : new Permission(permission);


        this._directPermissionsMap.set(
          perm.scope,
          perm
        );

      }

    }

  }



  /**
   * Aggregate direct + inherited permissions.
   */
  getAllPermissions() {

    const combinedMap =
      new Map(this._directPermissionsMap);



    for (const role of this._rolesMap.values()) {

      for (const permission of role.getPermissions()) {

        combinedMap.set(
          permission.scope,
          permission
        );

      }

    }


    return Array.from(
      combinedMap.values()
    );

  }




  /**
   * Flatten permissions into scopes.
   */
  getAllPermissionScopes() {

    return this
      .getAllPermissions()
      .map(permission => permission.scope);

  }




  /**
   * Check permission.
   */
  can(targetPermission) {

    const target =
      targetPermission instanceof Permission
        ? targetPermission
        : new Permission(targetPermission);


    return this
      .getAllPermissions()
      .some(permission =>
        permission.matches(target)
      );

  }




  /**
   * Check role membership.
   */
  hasRole(roleName) {

    if (typeof roleName !== "string") {
      return false;
    }


    return this._rolesMap.has(
      roleName.toUpperCase().trim()
    );

  }




  /**
   * Tenant isolation check.
   */
  isSameTenant(resource) {

    if (!resource || typeof resource !== "object") {
      return false;
    }


    const resourceTenant =
      resource.tenantId ||
      resource.tenant_id ||
      resource.organizationId;



    // Global resources
    if (!resourceTenant) {
      return true;
    }



    return String(this.tenantId) === String(resourceTenant);

  }




  /**
   * Convert actor into JWT/security claims.
   */
  toClaims() {

    return {
      userId: this.id,
      email: this.email,
      tenantId: this.tenantId,
      isSystem: this.isSystem,

      roles:
        Array.from(
          this._rolesMap.keys()
        ),

      permissions:
        this.getAllPermissionScopes(),
    };

  }




  /**
   * Serialize actor.
   */
  toJSON() {

    return {
      id: this.id,
      email: this.email,
      tenantId: this.tenantId,
      isSystem: this.isSystem,

      roles:
        Array.from(
          this._rolesMap.values()
        ).map(role => role.toJSON()),


      directPermissions:
        Array.from(
          this._directPermissionsMap.keys()
        ),


      metadata: this.metadata,
    };

  }

}