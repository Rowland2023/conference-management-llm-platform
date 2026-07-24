/**
 * @file src/Security/application/PermissionService.js
 * @description Core evaluation engine for granular domain permissions and segment wildcards.
 */

class PermissionService {
  /**
   * Evaluates if a single granted pattern satisfies a required permission string using segment matching.
   * e.g., 'payments:*' matches 'payments:read' and 'payments:transfers:write'
   * @private
   */
  _matchSegments(grantedPattern, requiredPermission) {
    if (grantedPattern === requiredPermission || grantedPattern === '*') return true;

    const grantedSegments = grantedPattern.split(':');
    const requiredSegments = requiredPermission.split(':');

    for (let i = 0; i < grantedSegments.length; i++) {
      const granted = grantedSegments[i];
      const required = requiredSegments[i];

      // Multi-level wildcard: '*' at current position grants everything remaining
      if (granted === '*') return true;

      // Segment mismatch or granted scope is shorter than required scope
      if (granted !== required) return false;
    }

    // Fully matched if segment lengths are identical
    return grantedSegments.length === requiredSegments.length;
  }

  /**
   * Checks if granted permissions satisfy a required permission.
   *
   * @param {Array<string>} grantedPermissions - Assigned principal permissions
   * @param {string} requiredPermission - Target permission string
   * @returns {boolean}
   */
  hasPermission(grantedPermissions = [], requiredPermission) {
    if (!requiredPermission) return true;
    if (!Array.isArray(grantedPermissions) || grantedPermissions.length === 0) return false;

    // Fast-path super-admin checks
    if (grantedPermissions.includes('*') || grantedPermissions.includes('*:*')) {
      return true;
    }

    return grantedPermissions.some((granted) => this._matchSegments(granted, requiredPermission));
  }

  /**
   * Validates if principal possesses ALL listed permissions.
   *
   * @param {Array<string>} grantedPermissions
   * @param {Array<string>} requiredPermissions
   * @returns {boolean}
   */
  hasAll(grantedPermissions = [], requiredPermissions = []) {
    if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) return true;
    return requiredPermissions.every((required) => this.hasPermission(grantedPermissions, required));
  }

  /**
   * Validates if principal possesses AT LEAST ONE of the listed permissions.
   *
   * @param {Array<string>} grantedPermissions
   * @param {Array<string>} requiredPermissions
   * @returns {boolean}
   */
  hasAny(grantedPermissions = [], requiredPermissions = []) {
    if (!Array.isArray(requiredPermissions) || requiredPermissions.length === 0) return true;
    return requiredPermissions.some((required) => this.hasPermission(grantedPermissions, required));
  }

  /**
   * Asserts permission or throws a domain security exception.
   *
   * @param {Array<string>} grantedPermissions
   * @param {string|Array<string>} required - Single permission string or array of required permissions
   * @param {'ALL'|'ANY'} [strategy='ALL'] - Matching strategy for arrays
   */
  enforce(grantedPermissions, required, strategy = 'ALL') {
    let allowed = false;

    if (Array.isArray(required)) {
      allowed = strategy === 'ANY' 
        ? this.hasAny(grantedPermissions, required) 
        : this.hasAll(grantedPermissions, required);
    } else {
      allowed = this.hasPermission(grantedPermissions, required);
    }

    if (!allowed) {
      const missing = Array.isArray(required) ? required.join(', ') : required;
      throw new Error(`Access denied: Missing required permission(s) [${missing}].`);
    }
  }
}

module.exports = PermissionService;