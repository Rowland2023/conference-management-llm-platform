/**
 * @file src/shared-security-starter/application/PermissionService.js
 * @description Core evaluation engine for granular domain permissions and segment wildcards.
 */

export class PermissionService {

  /**
   * Evaluates if a single granted pattern satisfies a required permission string using segment matching.
   * e.g., 'payments:*' matches 'payments:read' and 'payments:transfers:write'
   * @private
   */
  _matchSegments(grantedPattern, requiredPermission) {

    if (
      grantedPattern === requiredPermission ||
      grantedPattern === '*'
    ) {
      return true;
    }


    const grantedSegments =
      grantedPattern.split(':');

    const requiredSegments =
      requiredPermission.split(':');


    for (let i = 0; i < grantedSegments.length; i++) {

      const granted =
        grantedSegments[i];

      const required =
        requiredSegments[i];


      // Multi-level wildcard
      if (granted === '*') {
        return true;
      }


      // Segment mismatch
      if (granted !== required) {
        return false;
      }
    }


    return (
      grantedSegments.length ===
      requiredSegments.length
    );
  }



  /**
   * Checks if granted permissions satisfy a required permission.
   *
   * @param {Array<string>} grantedPermissions
   * @param {string} requiredPermission
   * @returns {boolean}
   */
  hasPermission(
    grantedPermissions = [],
    requiredPermission
  ) {

    if (!requiredPermission) {
      return true;
    }


    if (
      !Array.isArray(grantedPermissions) ||
      grantedPermissions.length === 0
    ) {
      return false;
    }


    // Fast-path platform administrator
    if (
      grantedPermissions.includes('*') ||
      grantedPermissions.includes('*:*')
    ) {
      return true;
    }


    return grantedPermissions.some(
      (granted) =>
        this._matchSegments(
          granted,
          requiredPermission
        )
    );
  }




  /**
   * Validates if principal possesses ALL listed permissions.
   */
  hasAll(
    grantedPermissions = [],
    requiredPermissions = []
  ) {

    if (
      !Array.isArray(requiredPermissions) ||
      requiredPermissions.length === 0
    ) {
      return true;
    }


    return requiredPermissions.every(
      (required) =>
        this.hasPermission(
          grantedPermissions,
          required
        )
    );
  }




  /**
   * Validates if principal possesses AT LEAST ONE permission.
   */
  hasAny(
    grantedPermissions = [],
    requiredPermissions = []
  ) {

    if (
      !Array.isArray(requiredPermissions) ||
      requiredPermissions.length === 0
    ) {
      return true;
    }


    return requiredPermissions.some(
      (required) =>
        this.hasPermission(
          grantedPermissions,
          required
        )
    );
  }




  /**
   * Asserts permission or throws security exception.
   */
  enforce(
    grantedPermissions,
    required,
    strategy = "ALL"
  ) {

    let allowed = false;


    if (Array.isArray(required)) {

      allowed =
        strategy === "ANY"
          ? this.hasAny(
              grantedPermissions,
              required
            )
          : this.hasAll(
              grantedPermissions,
              required
            );

    } else {

      allowed =
        this.hasPermission(
          grantedPermissions,
          required
        );
    }



    if (!allowed) {

      const missing =
        Array.isArray(required)
          ? required.join(", ")
          : required;


      throw new Error(
        `Access denied: Missing required permission(s) [${missing}].`
      );
    }
  }
}