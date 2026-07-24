/**
 * @file src/Security/infrastructure/jwt/JwtVerifier.js
 * @description Hardened JWT verification engine supporting asymmetric JWKS key sets and symmetric secrets.
 */

const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

class JwtVerifier {
  /**
   * @param {Object} params
   * @param {string} [params.jwksUri] - Remote JWKS endpoint URL for asymmetric verification (RS256/RS512)
   * @param {string} [params.secret] - Symmetric key for secret-based verification (HS256/HS512)
   * @param {string|Array<string>} [params.issuer] - Expected token issuer claim (iss)
   * @param {string|Array<string>} [params.audience] - Expected token audience claim (aud)
   * @param {number} [params.clockTolerance=5] - Allowed clock skew window in seconds
   * @param {Array<string>} [params.allowedAlgorithms] - Override default allowed signature algorithms
   * @param {Object} [params.logger=null] - Operational logger instance
   */
  constructor({
    jwksUri,
    secret,
    issuer = null,
    audience = null,
    clockTolerance = 5,
    allowedAlgorithms = null,
    logger = null,
  }) {
    if (!jwksUri && !secret) {
      throw new Error('[JwtVerifier] Either jwksUri or secret must be provided.');
    }

    if (jwksUri && secret) {
      throw new Error('[JwtVerifier] Config ambiguity: Provide EITHER jwksUri OR secret, not both.');
    }

    this.issuer = issuer;
    this.audience = audience;
    this.clockTolerance = Number.isInteger(clockTolerance) ? clockTolerance : 5;
    this.logger = logger;

    if (jwksUri) {
      this.isAsymmetric = true;
      this.allowedAlgorithms = allowedAlgorithms || ['RS256', 'RS384', 'RS512'];
      this.jwksClient = jwksClient({
        jwksUri,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 30,
        cacheMaxAge: 600000, // 10 minutes
        timeout: 5000, // 5 second HTTP timeout
      });
    } else {
      this.isAsymmetric = false;
      this.secret = secret;
      this.allowedAlgorithms = allowedAlgorithms || ['HS256', 'HS384', 'HS512'];
    }
  }

  /**
   * Resolves the signing key dynamically based on key type (JWKS vs. Symmetric).
   * @private
   */
  _getKey(header, callback) {
    if (!this.isAsymmetric) {
      return callback(null, this.secret);
    }

    if (!header || !header.kid) {
      return callback(new Error('JWT header missing required Key ID (kid).'));
    }

    this.jwksClient.getSigningKey(header.kid, (err, key) => {
      if (err) {
        if (this.logger) {
          this.logger.error(`[JwtVerifier] Failed to retrieve signing key for kid '${header.kid}': ${err.message}`);
        }
        return callback(new Error(`Unable to resolve signing key for kid '${header.kid}'.`));
      }

      const signingKey = key.getPublicKey() || key.rsaPublicKey;
      callback(null, signingKey);
    });
  }

  /**
   * Verifies and decodes a JWT token string.
   *
   * @param {string} token - Raw JWT string or Authorization header value ("Bearer <token>")
   * @returns {Promise<Object>} Decoded token payload claims
   */
  async verify(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Authentication failed: Missing or invalid token format.');
    }

    // Strip "Bearer " prefix safely
    const cleanToken = token.startsWith('Bearer ') || token.startsWith('bearer ')
      ? token.slice(7).trim()
      : token.trim();

    if (!cleanToken) {
      throw new Error('Authentication failed: Empty token string.');
    }

    return new Promise((resolve, reject) => {
      jwt.verify(
        cleanToken,
        this._getKey.bind(this),
        {
          issuer: this.issuer || undefined,
          audience: this.audience || undefined,
          algorithms: this.allowedAlgorithms,
          clockTolerance: this.clockTolerance,
        },
        (err, decoded) => {
          if (err) {
            if (this.logger) {
              this.logger.warn(`[JwtVerifier] Token verification failed: ${err.message}`);
            }

            // Standardize security exception boundary
            if (err.name === 'TokenExpiredError') {
              return reject(new Error('Authentication failed: Token has expired.'));
            }
            if (err.name === 'NotBeforeError') {
              return reject(new Error('Authentication failed: Token not active yet.'));
            }

            return reject(new Error('Authentication failed: Invalid signature or claims.'));
          }

          resolve(decoded);
        }
      );
    });
  }
}

module.exports = JwtVerifier;