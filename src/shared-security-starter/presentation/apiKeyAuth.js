/**
 * @file src/Security/presentation/apiKeyAuth.js
 * @description Express middleware for M2M API Key authentication and binding unified AuthContext.
 */

const { AuthContext, ApiClient } = require('../domain');

/**
 * Extracts client IP safely considering reverse proxy headers.
 * @private
 */
function extractClientIp(req) {
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor && typeof forwardedFor === 'string') {
    return forwardedFor.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '0.0.0.0';
}

/**
 * Safely extracts the raw API Key string from request headers.
 * @private
 */
function extractApiKey(req) {
  let headerValue = req.headers['x-api-key'];

  // Handle multi-header arrays defensively
  if (Array.isArray(headerValue)) {
    headerValue = headerValue[0];
  }

  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  // Fallback to "Authorization: ApiKey <key>" or "Authorization: Bearer <key>"
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string') {
    if (authHeader.startsWith('ApiKey ')) {
      return authHeader.substring(7).trim();
    }
  }

  return null;
}

/**
 * Factory creating M2M API Key authentication middleware.
 *
 * @param {Object} params
 * @param {Object} params.apiKeyVerifier - Application ApiKeyVerifier service
 * @param {Object} [params.logger=null] - Operational logger
 * @param {boolean} [params.allowExistingAuth=false] - If true, skips verification if req.auth is already bound
 * @returns {import('express').RequestHandler}
 */
function apiKeyAuth({ apiKeyVerifier, logger = null, allowExistingAuth = false }) {
  if (!apiKeyVerifier || typeof apiKeyVerifier.verify !== 'function') {
    throw new Error('[apiKeyAuth] Valid apiKeyVerifier instance with a verify() method is required.');
  }

  return async (req, res, next) => {
    // 1. Guard against overwriting pre-authenticated contexts
    if (allowExistingAuth && req.auth && req.auth.isAuthenticated()) {
      return next();
    }

    const clientIp = extractClientIp(req);

    try {
      const rawKey = extractApiKey(req);

      if (!rawKey) {
        return res.status(401).json({
          code: 'MISSING_API_KEY',
          message: 'API Key is missing from request headers.',
        });
      }

      // 2. Verify raw key via application service
      const result = await apiKeyVerifier.verify(rawKey);

      // 3. Resolve ApiClient domain entity
      let apiClient;
      if (result instanceof ApiClient) {
        apiClient = result;
      } else if (result && result.apiClient instanceof ApiClient) {
        apiClient = result.apiClient;
      } else {
        // Reconstruct domain entity preserving ALL security invariants
        apiClient = new ApiClient({
          clientId: result.clientId,
          name: result.name || result.metadata?.name || `M2M-${result.clientId}`,
          tenantId: result.tenantId || null,
          allowedScopes: result.scopes || result.allowedScopes || [],
          ipWhitelist: result.ipWhitelist || [],
          rateLimitPerMin: result.rateLimitPerMin || 1000,
          isActive: result.isActive !== false && !result.isRevoked,
          expiresAt: result.expiresAt ? new Date(result.expiresAt) : null,
          metadata: result.metadata || {},
        });
      }

      // 4. Defense-in-Depth: Enforce IP Whitelist if configured on the entity
      if (!apiClient.isIpAllowed(clientIp)) {
        if (logger && typeof logger.warn === 'function') {
          logger.warn('[API Key Auth] IP Whitelist violation', {
            clientId: apiClient.clientId,
            clientIp,
            path: req.path,
          });
        }

        return res.status(403).json({
          code: 'IP_NOT_ALLOWED',
          message: 'Access denied: Client IP address is not whitelisted for this API key.',
        });
      }

      // 5. Bind immutable AuthContext to the request
      const correlationId = String(
        req.headers['x-correlation-id'] || 
        req.headers['x-request-id'] || 
        req.id || 
        'm2m_' + Math.random().toString(36).substring(2, 9)
      );

      req.auth = new AuthContext({
        apiClient,
        correlationId,
        clientIp,
        userAgent: req.headers['user-agent'] || null,
      });

      return next();
    } catch (error) {
      if (logger && typeof logger.warn === 'function') {
        logger.warn('[API Key Auth Failed]', {
          path: req.path,
          method: req.method,
          ip: clientIp,
          errorName: error.name,
          errorMessage: error.message,
        });
      }

      return res.status(401).json({
        code: 'INVALID_API_KEY',
        message: 'API Key authentication failed. Key is invalid, revoked, or expired.',
      });
    }
  };
}

module.exports = apiKeyAuth;