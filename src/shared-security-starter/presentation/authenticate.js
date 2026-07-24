/**
 * @file src/Security/presentation/authenticate.js
 * @description Express middleware for authenticating JWT bearer tokens and binding unified AuthContext.
 */

const { AuthContext, Actor } = require('../domain');

/**
 * Extract client IP safely considering proxy headers.
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
 * Factory creating JWT authentication middleware.
 *
 * @param {Object} params
 * @param {Object} params.tokenVerifier - Application TokenVerifier or IdP Provider instance
 * @param {Object} [params.logger=null] - Operational logger instance
 * @param {boolean} [params.allowExistingAuth=false] - If true, skips verification if req.auth already exists
 * @returns {import('express').RequestHandler}
 */
function authenticate({ tokenVerifier, logger = null, allowExistingAuth = false }) {
  if (!tokenVerifier || typeof tokenVerifier.verify !== 'function') {
    throw new Error('[authenticate] Valid tokenVerifier instance with a verify() method is required.');
  }

  return async (req, res, next) => {
    // 1. Guard against overwriting pre-authenticated contexts (e.g., prior API Key middleware)
    if (allowExistingAuth && req.auth && req.auth.isAuthenticated()) {
      return next();
    }

    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          code: 'UNAUTHENTICATED',
          message: 'Missing or malformed Authorization header.',
        });
      }

      const token = authHeader.substring(7).trim();
      if (!token) {
        return res.status(401).json({
          code: 'UNAUTHENTICATED',
          message: 'Bearer token string cannot be empty.',
        });
      }

      // 2. Verify token payload via Application Layer TokenVerifier
      const verified = await tokenVerifier.verify(token);

      // 3. Resolve Actor domain entity (prefer IdP factory if available, fallback to entity mapping)
      let actor;
      if (typeof tokenVerifier.toActor === 'function') {
        // Uses IdP Provider ACL directly (KeycloakProvider, Auth0Provider, CognitoProvider)
        actor = tokenVerifier.toActor(verified.rawPayload || verified);
      } else if (verified.actor instanceof Actor) {
        actor = verified.actor;
      } else {
        // Construct Actor aggregate using normalized payload
        actor = new Actor({
          id: verified.userId || verified.sub,
          email: verified.email || null,
          tenantId: verified.tenantId || null,
          roles: verified.roles || [],
          directPermissions: verified.permissions || [],
          isSystem: Boolean(verified.isSystem || verified.isM2MClient),
          metadata: {
            clientId: verified.clientId || null,
            provider: verified.provider || 'jwt',
          },
        });
      }

      // 4. Bind immutable AuthContext to the request
      const correlationId = String(
        req.headers['x-correlation-id'] || 
        req.headers['x-request-id'] || 
        req.id || 
        'gen_' + Math.random().toString(36).substring(2, 9)
      );

      req.auth = new AuthContext({
        actor,
        correlationId,
        clientIp: extractClientIp(req),
        userAgent: req.headers['user-agent'] || null,
      });

      return next();
    } catch (error) {
      if (logger && typeof logger.warn === 'function') {
        logger.warn('[Authentication Failed]', {
          path: req.path,
          method: req.method,
          ip: extractClientIp(req),
          errorName: error.name,
          errorMessage: error.message,
        });
      }

      return res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'Authentication failed. Access token is invalid, expired, or untrusted.',
      });
    }
  };
}

module.exports = authenticate;