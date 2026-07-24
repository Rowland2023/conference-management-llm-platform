/**
 * @file src/Security/presentation/requireRole.js
 * @description Middleware restricting route access based on role assignment with AND/OR evaluation modes and SIEM telemetry.
 */

/**
 * Normalizes input role arguments into a clean array of strings.
 * @private
 */
function normalizeRoles(roles) {
  return roles
    .flat(Infinity)
    .filter(Boolean)
    .map((r) => String(r).toUpperCase().trim());
}

/**
 * Enforces role membership on route handlers.
 *
 * @param {string|Array<string>} expectedRoles - Allowed role string or array of role strings
 * @param {Object} [options]
 * @param {'ANY'|'ALL'} [options.mode='ANY'] - Evaluation strategy when multiple roles are specified
 * @param {Object} [options.logger=null] - Operational logger instance
 * @returns {import('express').RequestHandler}
 */
function requireRole(expectedRoles, { mode = 'ANY', logger = null } = {}) {
  const normalizedRoles = normalizeRoles(Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles]);

  if (normalizedRoles.length === 0) {
    throw new Error('[requireRole] At least one expected role must be supplied.');
  }

  return (req, res, next) => {
    const authContext = req.auth;

    // 1. Enforce Authentication Context Boundary
    if (!authContext || typeof authContext.isAuthenticated !== 'function' || !authContext.isAuthenticated()) {
      return res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Unauthenticated context. Valid authentication is required prior to role evaluation.',
      });
    }

    try {
      // 2. Evaluate Role Requirements against AuthContext (handles Actor or ApiClient context)
      const hasRole = mode === 'ALL'
        ? normalizedRoles.every((role) => authContext.hasRole(role))
        : normalizedRoles.some((role) => authContext.hasRole(role));

      if (!hasRole) {
        // Log Access Violation Telemetry for SIEM Auditing
        if (logger && typeof logger.warn === 'function') {
          logger.warn('[Role Check Denied]', {
            principalId: authContext.getPrincipalId(),
            tenantId: authContext.tenantId,
            correlationId: authContext.correlationId,
            clientIp: authContext.clientIp,
            requiredRoles: normalizedRoles,
            evaluationMode: mode,
            path: req.originalUrl || req.path,
            method: req.method,
          });
        }

        // 3. Return Generic 403 Response (Prevent Role Schema Disclosure)
        return res.status(403).json({
          code: 'FORBIDDEN',
          message: 'Access denied. You do not possess the required role assignment to access this resource.',
        });
      }

      return next();
    } catch (err) {
      if (logger && typeof logger.error === 'function') {
        logger.error('[requireRole] Evaluation error', {
          error: err.message,
          path: req.path,
        });
      }

      return res.status(500).json({
        code: 'AUTHORIZATION_ERROR',
        message: 'An internal error occurred during role evaluation.',
      });
    }
  };
}

module.exports = requireRole;