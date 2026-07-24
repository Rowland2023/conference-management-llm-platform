/**
 * @file src/Security/domain/Permission.js
 * @description Value Object representing fine-grained, immutable system access permissions.
 */

class Permission {
  /**
   * Valid scope segment format: alphanumeric, hyphen, underscore, or asterisk.
   * @private
   */
  static SEGMENT_REGEX = /^[a-z0-9_-]+|\*$/;

  /**
   * @param {string} scope - Domain permission string (e.g., "ledger:journals:create" or "payments:*")
   */
  constructor(scope) {
    if (!scope || typeof scope !== 'string' || !scope.trim()) {
      throw new Error('[Permission] Scope string must be a non-empty string.');
    }

    const normalized = scope.trim().toLowerCase();
    this._validateInvariants(normalized);

    this.scope = normalized;
    Object.freeze(this);
  }

  /**
   * Enforces domain invariants for valid colon-separated permission formats.
   * @private
   */
  _validateInvariants(scope) {
    if (scope === '*' || scope === '*:*') {
      return; // Global wildcards
    }

    const segments = scope.split(':');
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      if (!segment || !Permission.SEGMENT_REGEX.test(segment)) {
        throw new Error(`[Permission] Invalid scope segment '${segment}' in permission string '${scope}'.`);
      }
      // Wildcard can only appear as the terminating segment or global '*'
      if (segment === '*' && i !== segments.length - 1) {
        throw new Error(`[Permission] Wildcard '*' must only appear at the end of scope '${scope}'.`);
      }
    }
  }

  /**
   * Evaluates if this granted permission scope satisfies a required target permission scope.
   * Deterministic, zero-regex segment-by-segment comparison.
   *
   * @param {string|Permission} targetPermission
   * @returns {boolean}
   */
  matches(targetPermission) {
    if (!targetPermission) return false;

    const targetScope = targetPermission instanceof Permission
      ? targetPermission.scope
      : String(targetPermission).trim().toLowerCase();

    // Fast path: Exact string match or global wildcard
    if (this.scope === targetScope || this.scope === '*' || this.scope === '*:*') {
      return true;
    }

    const grantedSegments = this.scope.split(':');
    const targetSegments = targetScope.split(':');

    for (let i = 0; i < grantedSegments.length; i++) {
      const granted = grantedSegments[i];
      const target = targetSegments[i];

      // Terminal segment wildcard matches all remaining sub-paths
      if (granted === '*') {
        return true;
      }

      // Segment mismatch or granted scope is longer than target
      if (granted !== target) {
        return false;
      }
    }

    // Fully matched only if segment depth matches
    return grantedSegments.length === targetSegments.length;
  }

  /**
   * Value Object equality check.
   * @param {unknown} other
   * @returns {boolean}
   */
  equals(other) {
    return other instanceof Permission && other.scope === this.scope;
  }

  toString() {
    return this.scope;
  }

  toJSON() {
    return this.scope;
  }
}

module.exports = Permission;