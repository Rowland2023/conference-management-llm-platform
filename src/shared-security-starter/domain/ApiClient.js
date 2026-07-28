/**
 * @file src/shared-security-starter/domain/ApiClient.js
 * @description Domain entity modeling Machine-to-Machine (M2M) API Clients and system integrations.
 */

import { Permission } from "./Permission.js";


export class ApiClient {

  /**
   * @param {Object} params
   * @param {string} params.clientId
   * @param {string} params.name
   * @param {string|null} params.tenantId
   * @param {Array<Permission|string>} allowedScopes
   * @param {Array<string>} ipWhitelist
   * @param {number} rateLimitPerMin
   * @param {boolean} isActive
   * @param {Date|string|number|null} expiresAt
   * @param {Object} metadata
   */
  constructor({
    clientId,
    name,
    tenantId = null,
    allowedScopes = [],
    ipWhitelist = [],
    rateLimitPerMin = 1000,
    isActive = true,
    expiresAt = null,
    metadata = {},
  }) {

    if (
      !clientId ||
      typeof clientId !== "string" ||
      !clientId.trim()
    ) {
      throw new Error(
        "[ApiClient] Client ID is required and must be a non-empty string."
      );
    }


    if (
      !name ||
      typeof name !== "string" ||
      !name.trim()
    ) {
      throw new Error(
        "[ApiClient] Client name is required."
      );
    }


    this.clientId = clientId.trim();

    this.name = name.trim();

    this.tenantId =
      tenantId
        ? String(tenantId).trim()
        : null;


    this.ipWhitelist =
      Array.isArray(ipWhitelist)
        ? ipWhitelist.map(ip => ip.trim())
        : [];


    this.rateLimitPerMin =
      Number.isInteger(rateLimitPerMin) &&
      rateLimitPerMin > 0
        ? rateLimitPerMin
        : 1000;


    this.isActive = Boolean(isActive);


    this.expiresAt =
      this._parseExpirationDate(expiresAt);


    this.metadata = metadata || {};



    // Permission scope registry
    this._allowedScopesMap = new Map();


    if (Array.isArray(allowedScopes)) {

      for (const scope of allowedScopes) {

        const permission =
          scope instanceof Permission
            ? scope
            : new Permission(scope);


        this._allowedScopesMap.set(
          permission.scope,
          permission
        );

      }

    }

  }




  /**
   * Parse expiration safely.
   */
  _parseExpirationDate(expiresAt) {

    if (!expiresAt) {
      return null;
    }


    const date = new Date(expiresAt);


    if (Number.isNaN(date.getTime())) {

      throw new Error(
        `[ApiClient] Invalid expiration date provided: '${expiresAt}'.`
      );

    }


    return date;

  }





  /**
   * Checks whether API client credentials are active.
   */
  isValid() {

    if (!this.isActive) {
      return false;
    }


    if (
      this.expiresAt &&
      this.expiresAt.getTime() <= Date.now()
    ) {
      return false;
    }


    return true;

  }





  /**
   * Validates client IP.
   */
  isIpAllowed(ipAddress) {

    if (
      !this.ipWhitelist ||
      this.ipWhitelist.length === 0
    ) {
      return true;
    }


    if (!ipAddress) {
      return false;
    }


    return this.ipWhitelist.includes(
      ipAddress.trim()
    );

  }





  /**
   * Checks permission scope.
   */
  hasScope(targetScope) {

    if (!this.isValid()) {
      return false;
    }


    const target =
      targetScope instanceof Permission
        ? targetScope
        : new Permission(targetScope);



    for (const permission of this._allowedScopesMap.values()) {

      if (permission.matches(target)) {
        return true;
      }

    }


    return false;

  }





  /**
   * Convert M2M client into security principal claims.
   */
  toClaims() {

    return {

      userId:
        `m2m:${this.clientId}`,

      clientId:
        this.clientId,

      tenantId:
        this.tenantId,

      isSystem:
        true,

      roles:
        [
          "M2M_CLIENT"
        ],

      permissions:
        Array.from(
          this._allowedScopesMap.keys()
        ),

    };

  }





  /**
   * Serialize entity.
   */
  toJSON() {

    return {

      clientId:
        this.clientId,


      name:
        this.name,


      tenantId:
        this.tenantId,


      ipWhitelist:
        this.ipWhitelist,


      rateLimitPerMin:
        this.rateLimitPerMin,


      isActive:
        this.isActive,


      expiresAt:
        this.expiresAt
          ? this.expiresAt.toISOString()
          : null,


      allowedScopes:
        Array.from(
          this._allowedScopesMap.keys()
        ),


      metadata:
        this.metadata,

    };

  }

}