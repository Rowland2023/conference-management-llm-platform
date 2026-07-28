/**
 * @file src/shared-security-starter/application/index.js
 * @description Security Application Layer barrel export and DI Factory orchestrator.
 */

import { AuthService } from "./AuthService.js";
import { AuthorizationService } from "./AuthorizationService.js";
import { PermissionService } from "./PermissionService.js";
import { TokenVerifier } from "./TokenVerifier.js";
import { ApiKeyVerifier } from "./ApiKeyVerifier.js";



/**
 * Factory helper to assemble a fully wired security suite.
 *
 * @param {Object} config
 */
export function createSecurityContext(config) {

  const logger =
    config.logger || null;



  // 1. Core Policy Engines

  const permissionService =
    new PermissionService();



  const authorizationService =
    new AuthorizationService({
      permissionService,
      logger,
    });





  // 2. Authentication & Verification Services

  const tokenVerifier =
    new TokenVerifier({

      jwtProvider:
        config.jwtProvider,


      secretOrPublicKey:
        config.secretOrPublicKey,


      options:
        config.options || {},


      revocationStore:
        config.revocationStore || null,


      logger,

    });





  const apiKeyVerifier =
    new ApiKeyVerifier({

      apiKeyRepository:
        config.apiKeyRepository,


      secretSalt:
        config.apiKeySalt || "",


      logger,

    });





  const authService =
    new AuthService({

      userRepository:
        config.userRepository,


      passwordHasher:
        config.passwordHasher,


      tokenProvider:
        config.tokenProvider,


      sessionRepository:
        config.sessionRepository || null,


      logger,

    });





  return {

    permissionService,

    authorizationService,

    tokenVerifier,

    apiKeyVerifier,

    authService,

  };

}





export {

  AuthService,

  AuthorizationService,

  PermissionService,

  TokenVerifier,

  ApiKeyVerifier,

};