/**
 * @file src/shared-security-starter/application/AuthorizationService.js
 * @description Staff-grade authorization engine orchestrating strict RBAC,
 * fail-closed tenant isolation, and ABAC policies.
 */

export class AuthorizationService {

  constructor({
    permissionService,
    logger = null
  }) {

    if (!permissionService) {
      throw new Error(
        "[AuthorizationService] permissionService is required."
      );
    }

    this.permissionService = permissionService;
    this.logger = logger;

  }





  /**
   * Enforces strict fail-closed multi-tenant boundary checks.
   * @private
   */
  _validateTenantBoundary(principal, resource) {

    const resourceTenant =
      resource.tenantId ||
      resource.tenant_id ||
      resource.organizationId;



    // Non tenant-scoped resources pass isolation
    if (!resourceTenant) {
      return true;
    }




    const hasGlobalTenantAccess =
      this.permissionService.hasPermission(
        principal.permissions,
        "platform:tenants:cross-access"
      );



    if (hasGlobalTenantAccess) {
      return true;
    }




    if (
      !principal.tenantId ||
      String(principal.tenantId) !== String(resourceTenant)
    ) {

      this.logger?.warn?.(
        `[AuthorizationService] Tenant boundary breach attempt. Principal Tenant: '${principal.tenantId}', Resource Tenant: '${resourceTenant}', Principal ID: '${principal.userId}'`
      );


      return false;
    }


    return true;

  }





  /**
   * Evaluates ownership and ABAC rules.
   * @private
   */
  _validateOwnershipAndAbac(
    principal,
    requiredPermission,
    resource,
    abacPolicy
  ) {


    // Custom ABAC policy has priority
    if (typeof abacPolicy === "function") {

      return abacPolicy(
        principal,
        resource
      );

    }




    const resourceOwner =
      resource.ownerId ||
      resource.owner_id ||
      resource.userId;



    if (resourceOwner) {

      const isOwner =
        String(resourceOwner) === String(principal.userId);



      if (isOwner) {
        return true;
      }




      const elevatedPermission =
        `${requiredPermission}:any`;



      const hasElevatedScope =
        this.permissionService.hasPermission(
          principal.permissions,
          elevatedPermission
        );



      if (!hasElevatedScope) {

        this.logger?.debug?.(
          `[AuthorizationService] Ownership check failed for User '${principal.userId}' on Resource owned by '${resourceOwner}'.`
        );


        return false;

      }

    }


    return true;

  }





  /**
   * Authorizes a principal against permission and resource policies.
   *
   * @returns {boolean}
   */
  authorize(
    principal,
    requiredPermission,
    resource = null,
    abacPolicy = null
  ) {


    if (
      !principal ||
      typeof principal !== "object"
    ) {

      throw new Error(
        "[AuthorizationService] Missing or invalid principal context."
      );

    }




    const hasBasePermission =
      this.permissionService.hasPermission(
        principal.permissions,
        requiredPermission
      );



    if (!hasBasePermission) {
      return false;
    }





    if (
      resource &&
      typeof resource === "object"
    ) {


      const tenantValid =
        this._validateTenantBoundary(
          principal,
          resource
        );


      if (!tenantValid) {
        return false;
      }





      const abacValid =
        this._validateOwnershipAndAbac(
          principal,
          requiredPermission,
          resource,
          abacPolicy
        );


      if (!abacValid) {
        return false;
      }

    }



    return true;

  }





  /**
   * Throws if authorization fails.
   */
  assertAuthorized(
    principal,
    requiredPermission,
    resource = null,
    abacPolicy = null
  ) {


    const authorized =
      this.authorize(
        principal,
        requiredPermission,
        resource,
        abacPolicy
      );



    if (!authorized) {


      this.logger?.warn?.(
        `[AuthorizationService] Access denied for user '${principal?.userId}' requesting permission '${requiredPermission}'`
      );



      throw new Error(
        "Access denied: Unauthorized operation for requested resource."
      );

    }

  }

}