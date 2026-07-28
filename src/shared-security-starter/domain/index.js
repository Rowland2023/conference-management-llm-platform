/**
 * @file src/shared-security-starter/presentation/authenticate.js
 * @description Express middleware for authenticating JWT bearer tokens
 * and binding a unified AuthContext.
 */

export { Actor } from "./Actor.js";
export { AuthContext } from "./AuthContext.js";

/**
 * Extract client IP safely considering proxy headers.
 * @private
 */
function extractClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];

  if (forwardedFor && typeof forwardedFor === "string") {
    return forwardedFor.split(",")[0].trim();
  }

  return req.ip || req.socket?.remoteAddress || "0.0.0.0";
}

/**
 * Factory creating JWT authentication middleware.
 *
 * @param {Object} params
 * @param {Object} params.tokenVerifier
 * @param {Object|null} [params.logger=null]
 * @param {boolean} [params.allowExistingAuth=false]
 * @returns {import("express").RequestHandler}
 */
export function authenticate({
  tokenVerifier,
  logger = null,
  allowExistingAuth = false,
}) {
  if (!tokenVerifier || typeof tokenVerifier.verify !== "function") {
    throw new Error(
      "[authenticate] Valid tokenVerifier instance with a verify() method is required."
    );
  }

  return async (req, res, next) => {
    if (allowExistingAuth && req.auth?.isAuthenticated()) {
      return next();
    }

    try {
      const authHeader = req.headers.authorization;

      if (
        !authHeader ||
        typeof authHeader !== "string" ||
        !authHeader.startsWith("Bearer ")
      ) {
        return res.status(401).json({
          code: "UNAUTHENTICATED",
          message: "Missing or malformed Authorization header.",
        });
      }

      const token = authHeader.substring(7).trim();

      if (!token) {
        return res.status(401).json({
          code: "UNAUTHENTICATED",
          message: "Bearer token string cannot be empty.",
        });
      }

      // Verify token
      const verified = await tokenVerifier.verify(token);

      let actor;

      if (typeof tokenVerifier.toActor === "function") {
        actor = tokenVerifier.toActor(verified.rawPayload || verified);
      } else if (verified.actor instanceof Actor) {
        actor = verified.actor;
      } else {
        actor = new Actor({
          id: verified.userId || verified.sub,
          email: verified.email ?? null,
          tenantId: verified.tenantId ?? null,
          roles: verified.roles ?? [],
          directPermissions: verified.permissions ?? [],
          isSystem: Boolean(
            verified.isSystem || verified.isM2MClient
          ),
          metadata: {
            clientId: verified.clientId ?? null,
            provider: verified.provider ?? "jwt",
          },
        });
      }

      const correlationId = String(
        req.headers["x-correlation-id"] ||
          req.headers["x-request-id"] ||
          req.id ||
          `gen_${Math.random().toString(36).slice(2, 9)}`
      );

      req.auth = new AuthContext({
        actor,
        correlationId,
        clientIp: extractClientIp(req),
        userAgent: req.headers["user-agent"] ?? null,
      });

      next();
    } catch (error) {
      logger?.warn?.("[Authentication Failed]", {
        path: req.path,
        method: req.method,
        ip: extractClientIp(req),
        errorName: error.name,
        errorMessage: error.message,
      });

      return res.status(401).json({
        code: "INVALID_TOKEN",
        message:
          "Authentication failed. Access token is invalid, expired, or untrusted.",
      });
    }
  };
}