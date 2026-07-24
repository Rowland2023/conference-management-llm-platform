/**
 * @file src/Security/application/index.js
 * @description Security Application Layer barrel export and DI Factory orchestrator.
 */

const AuthService = require('./AuthService');
const AuthorizationService = require('./AuthorizationService');
const PermissionService = require('./PermissionService');
const TokenVerifier = require('./TokenVerifier');
const ApiKeyVerifier = require('./ApiKeyVerifier');

/**
 * Factory helper to assemble a fully wired security suite.
 *
 * @param {Object} config
 * @param {Object} config.userRepository
 * @param {Object} config.apiKeyRepository
 * @param {Object} config.passwordHasher
 * @param {Object} config.tokenProvider
 * @param {Object} config.jwtProvider
 * @param {string|Function} config.secretOrPublicKey
 * @param {Object} [config.options] - Token verification options (issuer, audience)
 * @param {Object} [config.sessionRepository]
 * @param {Object} [config.revocationStore]
 * @param {string} [config.apiKeySalt]
 * @param {Object} [config.logger]
 */
function createSecurityContext(config) {
  const logger = config.logger || null;

  // 1. Core Policy Engines
  const permissionService = new PermissionService();

  const authorizationService = new AuthorizationService({
    permissionService,
    logger,
  });

  // 2. Authentication & Verification Services
  const tokenVerifier = new TokenVerifier({
    jwtProvider: config.jwtProvider,
    secretOrPublicKey: config.secretOrPublicKey,
    options: config.options || {},
    revocationStore: config.revocationStore || null,
    logger,
  });

  const apiKeyVerifier = new ApiKeyVerifier({
    apiKeyRepository: config.apiKeyRepository,
    secretSalt: config.apiKeySalt || '',
    logger,
  });

  const authService = new AuthService({
    userRepository: config.userRepository,
    passwordHasher: config.passwordHasher,
    tokenProvider: config.tokenProvider,
    sessionRepository: config.sessionRepository || null,
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

module.exports = {
  AuthService,
  AuthorizationService,
  PermissionService,
  TokenVerifier,
  ApiKeyVerifier,
  createSecurityContext,
};