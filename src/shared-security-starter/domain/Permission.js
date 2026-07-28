 /**
 * @file src/shared-security-starter/domain/Permission.js
 * @description Value Object representing fine-grained, immutable system access permissions.
 */

export class Permission {

  /**
   * Valid scope segment format: alphanumeric, hyphen, underscore, or asterisk.
   */
  static SEGMENT_REGEX = /^[a-z0-9_-]+|\*$/;


  /**
   * @param {string} scope
   */
  constructor(scope) {

    if (
      !scope ||
      typeof scope !== "string" ||
      !scope.trim()
    ) {
      throw new Error(
        "[Permission] Scope string must be a non-empty string."
      );
    }


    const normalized =
      scope.trim().toLowerCase();


    this._validateInvariants(normalized);


    this.scope = normalized;


    Object.freeze(this);

  }





  /**
   * Enforces permission scope invariants.
   */
  _validateInvariants(scope) {

    if (
      scope === "*" ||
      scope === "*:*"
    ) {
      return;
    }


    const segments =
      scope.split(":");


    for (
      let i = 0;
      i < segments.length;
      i++
    ) {

      const segment =
        segments[i];


      if (
        !segment ||
        !Permission.SEGMENT_REGEX.test(segment)
      ) {

        throw new Error(
          `[Permission] Invalid scope segment '${segment}' in permission string '${scope}'.`
        );

      }


      // wildcard only allowed at the end
      if (
        segment === "*" &&
        i !== segments.length - 1
      ) {

        throw new Error(
          `[Permission] Wildcard '*' must only appear at the end of scope '${scope}'.`
        );

      }

    }

  }





  /**
   * Checks whether this permission grants target permission.
   */
  matches(targetPermission) {

    if (!targetPermission) {
      return false;
    }


    const targetScope =
      targetPermission instanceof Permission
        ? targetPermission.scope
        : String(targetPermission)
            .trim()
            .toLowerCase();



    if (
      this.scope === targetScope ||
      this.scope === "*" ||
      this.scope === "*:*"
    ) {

      return true;

    }



    const grantedSegments =
      this.scope.split(":");


    const targetSegments =
      targetScope.split(":");



    for (
      let i = 0;
      i < grantedSegments.length;
      i++
    ) {

      const granted =
        grantedSegments[i];


      const target =
        targetSegments[i];



      if (granted === "*") {
        return true;
      }



      if (granted !== target) {
        return false;
      }

    }



    return (
      grantedSegments.length ===
      targetSegments.length
    );

  }





  /**
   * Value Object equality.
   */
  equals(other) {

    return (
      other instanceof Permission &&
      other.scope === this.scope
    );

  }





  toString() {

    return this.scope;

  }





  toJSON() {

    return this.scope;

  }

}