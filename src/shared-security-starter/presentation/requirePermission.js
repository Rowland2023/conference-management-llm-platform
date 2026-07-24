/**
 * @file src/Security/presentation/requirePermission.js
 * @description Middleware restricting route access based on fine-grained permissions with AND/OR logic and dynamic parameter resolution.
 */

/**
 * Resolves permission templates against Express request parameter objects.
 * Example: 'account:{params.accountId}:write' + req.params={ accountId: '987' } => 'account:987:write'
 * @private
 */
function interpolatePermission(permissionTemplate, req) {
  if (!permissionTemplate.includes('{')) return permissionTemplate;

  return permissionTemplate.replace(/\{params\.([a-zA-Z0-9_]+)\}/g, (_, paramName) => {
    const value = req.params?.[paramName];
    if (!value) {
      throw new Error(`[requirePermission] Unresolved path parameter '${paramName}' in permission scope.`);
    }
    return String(value);
  });
}

/**
 * Evaluates permission requirement against AuthContext.
 * @private
 */
function evaluateAccess(authContext, requiredScope, mode, req) {
  if (Array.isArray(requiredScope)) {
    const interpolatedScopes = requiredScope.map((scope) => interpolatePermission(scope, req));

    if (mode === 'ALL') {
      // AND logic: Principal must satisfy ALL permissions
      return interpolatedScopes.every((scope) => authContext.hasAccess(scope));
    }
    // OR logic: Principal must satisfy AT LEAST ONE permission
    return interpolatedScopes.some((scope) => authContext.hasAccess(scope));
  }

  const singleScope = interpolatePermission(requiredScope, req);
  return authContext.hasAccess(singleScope);
}

/**
 * Enforces required permission scope(s) on an endpoint.
 *
 * @param {string|Array<string>} requiredScope - Target permission scope or array of scopes
 * @param {Object} [options]
 * @param {'ANY'|'ALL'} [options.mode='ANY'] - Evaluation strategy when passing array of permissions
 * @param {Object} [options.logger=null] - Operational logger instance
 * @returns {import('express').RequestHandler}
 */
function requirePermission(requiredScope, { mode = 'ANY', logger = null } = {}) {
  if (!requiredScope || (Array.isArray(requiredScope) && requiredScope.length === 0)) {
    throw new Error('[requirePermission] Target permission scope or non-empty array is required.');
  }

  return (req, res, next) => {
    const authContext = req.auth;

    // 1. Enforce Authentication Context Boundary
    if (!authContext || typeof authContext.isAuthenticated !== 'function' || !authContext.isAuthenticated()) {
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Unauthenticated context. Valid authentication is required prior to authorization.',
      });
    }

    try {
      // 2. Evaluate Permission Requirements
      const hasPermission = evaluateAccess(authContext, requiredScope, mode, req);

      if (!hasPermission) {
        // Log Access Violation Telemetry for SIEM Security Auditing
        if (logger && typeof logger.warn === 'function') {
          logger.warn('[Authorization Denied]', {
            principalId: authContext.getPrincipalId(),
            tenantId: authContext.tenantId,
            correlationId: authContext.correlationId,
            clientIp: authContext.clientIp,
            requiredScope,
            evaluationMode: mode,
            path: req.originalUrl || req.path,
            method: req.method,
          });
        }

        // 3. Return Generic 403 Response (Prevent Permission Schema Information Disclosure)
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: 'Access denied. You do not possess the required permissions to perform this action.',
        });
      }

      return next();
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[requirePermission] Evaluation error', {
          error: err.message,
          path: req.path,
        });
      }

      return res.status(500).json({
        code: 'AUTHORIZATION_ERROR',
        message: 'An internal error occurred during permission evaluation.',
      });
    }
  };
}

module.exports = requirePermission;