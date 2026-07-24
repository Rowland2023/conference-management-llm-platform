/**
 * @file src/Security/application/AuthorizationService.js
 * @description Staff-grade authorization engine orchestrating strict RBAC, fail-closed tenant isolation, and ABAC policies.
 */

class AuthorizationService {
  /**
   * @param {Object} params
   * @param {import('./PermissionService')} params.permissionService - Core permission matching service
   * @param {Object} [params.logger] - Application logger instance
   */
  constructor({ permissionService, logger = null }) {
    if (!permissionService) {
      throw new Error('[AuthorizationService] permissionService is required.');
    }
    this.permissionService = permissionService;
    this.logger = logger;
  }

  /**
   * Enforces strict fail-closed multi-tenant boundary checks.
   * @private
   */
  _validateTenantBoundary(principal, resource) {
    const resourceTenant = resource.tenantId || resource.tenant_id || resource.organizationId;
    
    // If the resource isn't tenant-scoped, tenant isolation check passes
    if (!resourceTenant) {
      return true;
    }

    // Platform global admins with explicit wildcard cross-tenant permission
    const hasGlobalTenantAccess = this.permissionService.hasPermission(
      principal.permissions,
      'platform:tenants:cross-access'
    );

    if (hasGlobalTenantAccess) {
      return true;
    }

    // Fail-closed: If resource has a tenant ID, principal MUST have a matching tenant ID
    if (!principal.tenantId || String(principal.tenantId) !== String(resourceTenant)) {
      if (this.logger) {
        this.logger.warn(
          `[AuthorizationService] Tenant boundary breach attempt. Principal Tenant: '${principal.tenantId}', Resource Tenant: '${resourceTenant}', Principal ID: '${principal.userId}'`
        );
      }
      return false;
    }

    return true;
  }

  /**
   * Evaluates resource-level ownership and custom ABAC predicates.
   * @private
   */
  _validateOwnershipAndAbac(principal, requiredPermission, resource, abacPolicy) {
    // 1. Execute custom ABAC rule/predicate if provided
    if (typeof abacPolicy === 'function') {
      return abacPolicy(principal, resource);
    }

    // 2. Evaluate resource ownership if ownerId exists on entity
    const resourceOwner = resource.ownerId || resource.owner_id || resource.userId;
    if (resourceOwner) {
      const isOwner = String(resourceOwner) === String(principal.userId);
      if (isOwner) {
        return true;
      }

      // If not the owner, check if principal has explicit elevated permission (e.g. 'documents:read:any')
      const anyScopePermission = `${requiredPermission}:any`;
      const hasElevatedScope = this.permissionService.hasPermission(principal.permissions, anyScopePermission);
      
      if (!hasElevatedScope) {
        if (this.logger) {
          this.logger.debug(
            `[AuthorizationService] Ownership check failed for User '${principal.userId}' on Resource owned by '${resourceOwner}'.`
          );
        }
        return false;
      }
    }

    return true;
  }

  /**
   * Authorizes a principal to perform an action against a specific resource context.
   *
   * @param {Object} principal - Authenticated security principal ({ userId, permissions, tenantId, roles })
   * @param {string} requiredPermission - Required permission string
   * @param {Object} [resource=null] - Domain entity context
   * @param {(principal: Object, resource: Object) => boolean} [abacPolicy=null] - Optional dynamic policy function
   * @returns {boolean}
   */
  authorize(principal, requiredPermission, resource = null, abacPolicy = null) {
    if (!principal || typeof principal !== 'object') {
      throw new Error('[AuthorizationService] Missing or invalid principal context.');
    }

    // 1. RBAC Baseline Check: Does principal have the base permission?
    const hasBasePermission = this.permissionService.hasPermission(principal.permissions, requiredPermission);
    if (!hasBasePermission) {
      return false;
    }

    // 2. Resource Context Evaluation
    if (resource && typeof resource === 'object') {
      // Step A: Fail-Closed Tenant Isolation Boundary Check
      const isTenantValid = this._validateTenantBoundary(principal, resource);
      if (!isTenantValid) {
        return false;
      }

      // Step B: Ownership & ABAC Policy Evaluation
      const isAbacValid = this._validateOwnershipAndAbac(principal, requiredPermission, resource, abacPolicy);
      if (!isAbacValid) {
        return false;
      }
    }

    return true;
  }

  /**
   * Asserts authorization or throws a domain security exception with zero leakage.
   *
   * @param {Object} principal
   * @param {string} requiredPermission
   * @param {Object} [resource=null]
   * @param {Function} [abacPolicy=null]
   */
  assertAuthorized(principal, requiredPermission, resource = null, abacPolicy = null) {
    const isAuthorized = this.authorize(principal, requiredPermission, resource, abacPolicy);
    if (!isAuthorized) {
      if (this.logger) {
        this.logger.warn(
          `[AuthorizationService] Access denied for user '${principal?.userId}' requesting permission '${requiredPermission}'`
        );
      }
      throw new Error('Access denied: Unauthorized operation for requested resource.');
    }
  }
}

module.exports = AuthorizationService;