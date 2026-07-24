/**
 * @file src/Security/presentation/authorize.js
 * @description Dynamic ABAC/PBAC authorization middleware evaluating runtime resource contexts against AuthorizationService policies.
 */

/**
 * Safely executes the resource extractor function against the Express request.
 * @private
 */
async function extractResourceContext(resourceExtractor, req) {
  if (typeof resourceExtractor !== 'function') {
    return null;
  }
  try {
    return await resourceExtractor(req);
  } catch (extractorErr) {
    throw new Error(`[authorize] Resource extractor failed: ${extractorErr.message}`);
  }
}

/**
 * Dynamic authorization middleware factory.
 *
 * @param {Object} params
 * @param {Object} params.authorizationService - Application layer AuthorizationService instance
 * @param {string} params.permission - Target permission or policy action string (e.g., 'transfers:disburse')
 * @param {(req: import('express').Request) => Promise<Object>|Object} [params.resourceExtractor=null] - Dynamic resource extraction resolver
 * @param {Object} [params.logger=null] - Operational/SIEM logger
 * @returns {import('express').RequestHandler}
 */
function authorize({ authorizationService, permission, resourceExtractor = null, logger = null }) {
  if (!authorizationService || typeof authorizationService.authorize !== 'function') {
    throw new Error('[authorize] Valid authorizationService with an authorize() method is required.');
  }

  if (!permission || typeof permission !== 'string') {
    throw new Error('[authorize] Target permission scope string is required.');
  }

  return async (req, res, next) => {
    const authContext = req.auth;

    // 1. Enforce Authentication Context Boundary
    if (!authContext || typeof authContext.isAuthenticated !== 'function' || !authContext.isAuthenticated()) {
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Unauthenticated context. Valid authentication is required prior to resource authorization.',
      });
    }

    try {
      // 2. Extract target resource context safely at runtime
      const resource = await extractResourceContext(resourceExtractor, req);

      // 3. Delegate to Application Layer AuthorizationService (Async Evaluation)
      // Pass authContext directly or extract structured principal domain context
      const isAuthorized = await authorizationService.authorize(authContext, permission, resource);

      if (!isAuthorized) {
        // Log Authorization Failure Telemetry for SIEM Security Auditing
        if (logger && typeof logger.warn === 'function') {
          logger.warn('[ABAC Authorization Denied]', {
            principalId: authContext.getPrincipalId(),
            tenantId: authContext.tenantId,
            correlationId: authContext.correlationId,
            clientIp: authContext.clientIp,
            permission,
            resource: resource ? JSON.stringify(resource) : null,
            path: req.originalUrl || req.path,
            method: req.method,
          });
        }

        // 4. Return Generic 403 Response (Prevent Resource Structure Disclosure)
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: 'Access denied for the requested resource and operation.',
        });
      }

      return next();
    } catch (error) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[authorize] Middleware execution error', {
          errorName: error.name,
          errorMessage: error.message,
          path: req.path,
          correlationId: authContext?.correlationId,
        });
      }

      return res.status(500).json({
        code: 'AUTHORIZATION_ERROR',
        message: 'An internal error occurred while evaluating authorization policy.',
      });
    }
  };
}

module.exports = authorize;