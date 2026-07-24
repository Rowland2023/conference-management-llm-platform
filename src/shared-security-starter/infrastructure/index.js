/**
 * @file src/Security/infrastructure/index.js
 * @description Centralized barrel file exporting hardened security infrastructure components, repositories, and IdP adapters.
 */

const JwtVerifier = require('./jwt/JwtVerifier');
const ApiKeyHasher = require('./api-key/ApiKeyHasher');
const ApiKeyRepository = require('./api-key/ApiKeyRepository');
const PermissionCache = require('./cache/PermissionCache');
const KeycloakProvider = require('./providers/KeycloakProvider');
const Auth0Provider = require('./providers/Auth0Provider');
const CognitoProvider = require('./providers/CognitoProvider');

/**
 * Immutable export map for the Security Infrastructure module.
 */
const securityInfrastructure = Object.freeze({
  // Token & Cryptographic Engines
  JwtVerifier,
  ApiKeyHasher,

  // Persistence & Cache Adapters
  ApiKeyRepository,
  PermissionCache,

  // Identity Provider Anti-Corruption Layer (ACL) Adapters
  KeycloakProvider,
  Auth0Provider,
  CognitoProvider,
});

module.exports = securityInfrastructure;