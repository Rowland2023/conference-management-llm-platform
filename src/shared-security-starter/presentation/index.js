/**
 * @file src/Security/presentation/index.js
 * @description Centralized barrel file exporting HTTP presentation security middleware factories.
 */

const authenticate = require('./authenticate');
const apiKeyAuth = require('./apiKeyAuth');
const requirePermission = require('./requirePermission');
const requireRole = require('./requireRole');
const authorize = require('./authorize');

/**
 * Composite middleware generator for endpoints accepting EITHER JWT Bearer OR M2M API Key.
 *
 * @param {Object} params
 * @param {Object} params.tokenVerifier - Token verifier instance for JWTs
 * @param {Object} params.apiKeyVerifier - API key verifier instance for M2M keys
 * @param {Object} [params.logger=null] - Operational logger
 * @returns {import('express').RequestHandler}
 */
function authenticateOrApiKey({ tokenVerifier, apiKeyVerifier, logger = null }) {
  const jwtMw = authenticate({ tokenVerifier, logger, allowExistingAuth: true });
  const apiKeyMw = apiKeyAuth({ apiKeyVerifier, logger, allowExistingAuth: true });

  return async (req, res, next) => {
    // 1. If x-api-key header or ApiKey auth header is present, attempt API key authentication first
    const hasApiKeyHeader = Boolean(
      req.headers['x-api-key'] ||
      (typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('ApiKey '))
    );

    if (hasApiKeyHeader) {
      return apiKeyMw(req, res, next);
    }

    // 2. Default to JWT Bearer Authentication
    return jwtMw(req, res, next);
  };
}

/**
 * Immutable export map for Security Presentation Middleware.
 */
const presentationSecurity = Object.freeze({
  // Authentication Factories
  authenticate,
  apiKeyAuth,
  authenticateOrApiKey,

  // Authorization Factories
  requirePermission,
  requireRole,
  authorize,
});

module.exports = presentationSecurity;