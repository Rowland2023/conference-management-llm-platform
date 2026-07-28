/**
 * @file src/shared-security-starter/domain/AuthContext.js
 * @description Domain Value Object encapsulating execution identity, security scope, and tracing for in-flight contexts.
 */

import { Actor } from "./Actor.js";
import { ApiClient } from "./ApiClient.js";


export class AuthContext {

  /**
   * @param {Object} params
   */
  constructor({
    actor = null,
    apiClient = null,
    correlationId = null,
    clientIp = null,
    authenticatedAt = null,
  } = {}) {


    this.actor =
      actor instanceof Actor
        ? actor
        : null;


    this.apiClient =
      apiClient instanceof ApiClient
        ? apiClient
        : null;


    this.correlationId =
      correlationId
        ? String(correlationId).trim()
        : null;


    this.clientIp =
      clientIp
        ? String(clientIp).trim()
        : null;


    this.authenticatedAt =
      authenticatedAt
        ? new Date(authenticatedAt)
        : new Date();



    // M2M IP boundary enforcement
    if (
      this.apiClient &&
      this.clientIp &&
      !this.apiClient.isIpAllowed(this.clientIp)
    ) {

      throw new Error(
        `[AuthContext] Client IP '${this.clientIp}' is not permitted for API Client '${this.apiClient.clientId}'.`
      );

    }



    // Tenant isolation validation
    if (
      this.actor?.tenantId &&
      this.apiClient?.tenantId
    ) {

      if (
        String(this.actor.tenantId) !==
        String(this.apiClient.tenantId)
      ) {

        throw new Error(
          `[AuthContext] Tenant mismatch between Actor (${this.actor.tenantId}) and ApiClient (${this.apiClient.tenantId}).`
        );

      }

    }


    Object.freeze(this);

  }





  /**
   * Creates anonymous security context.
   */
  static anonymous(correlationId = null) {

    return new AuthContext({
      correlationId
    });

  }





  /**
   * Creates internal system execution context.
   */
  static createSystemContext(
    correlationId = null,
    systemPermissions = ["*"]
  ) {

    const systemActor =
      new Actor({

        id: "SYSTEM_INTERNAL",

        isSystem: true,

        directPermissions:
          systemPermissions,

      });



    return new AuthContext({
      actor: systemActor,
      correlationId,
    });

  }





  /**
   * Returns true when authenticated identity exists.
   */
  isAuthenticated() {

    if (this.actor) {
      return true;
    }


    if (this.apiClient) {
      return this.apiClient.isValid();
    }


    return false;

  }





  /**
   * Resolve tenant boundary.
   */
  getTenantId() {

    return (
      this.actor?.tenantId ||
      this.apiClient?.tenantId ||
      null
    );

  }





  /**
   * Permission evaluation.
   */
  hasAccess(scope) {

    if (!this.isAuthenticated()) {
      return false;
    }



    // Delegated access:
    // User + API Client must both allow permission
    if (
      this.actor &&
      this.apiClient
    ) {

      return (
        this.actor.can(scope) &&
        this.apiClient.hasScope(scope)
      );

    }



    if (this.actor) {
      return this.actor.can(scope);
    }



    if (this.apiClient) {
      return this.apiClient.hasScope(scope);
    }



    return false;

  }





  /**
   * Unified principal claims.
   */
  toPrincipal() {

    if (this.actor) {
      return this.actor.toClaims();
    }


    if (this.apiClient) {
      return this.apiClient.toClaims();
    }



    return {

      userId: "ANONYMOUS",

      tenantId: null,

      roles: [],

      permissions: [],

    };

  }





  /**
   * Serialize context.
   */
  toJSON() {

    return {

      isAuthenticated:
        this.isAuthenticated(),


      principalId:
        this.actor?.id ||
        (
          this.apiClient
            ? `m2m:${this.apiClient.clientId}`
            : "ANONYMOUS"
        ),


      tenantId:
        this.getTenantId(),


      correlationId:
        this.correlationId,


      clientIp:
        this.clientIp,


      authenticatedAt:
        this.authenticatedAt.toISOString(),


      actor:
        this.actor
          ? this.actor.toJSON()
          : null,


      apiClient:
        this.apiClient
          ? this.apiClient.toJSON()
          : null,

    };

  }

}