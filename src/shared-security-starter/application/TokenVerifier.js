/**
 * @file src/Security/application/TokenVerifier.js
 * @description Staff-grade JWT verifier - RS256-only, JWKS, revocation, no leakage
 */

class TokenVerifier {
  constructor({
    jwtProvider,
    secretOrPublicKey,
    options = {},
    algorithm = 'RS256',
    revocationStore = null,
    logger = null,
  }) {
    if (!jwtProvider ||!secretOrPublicKey) {
      throw new Error('[TokenVerifier] jwtProvider and secretOrPublicKey are required.');
    }

    // ENFORCE asymmetric only for platform auth - never allow HS* in same verifier
    const ASYMMETRIC_ONLY = ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'ES512'];
    if (!ASYMMETRIC_ONLY.includes(algorithm)) {
      throw new Error(`[TokenVerifier] For platform auth, only asymmetric allowed: ${algorithm}`);
    }

    this.jwtProvider = jwtProvider;
    this.keyResolver = secretOrPublicKey;
    this.algorithm = algorithm;
    this.revocationStore = revocationStore;
    this.logger = logger;

    if (!options.issuer ||!options.audience) {
      throw new Error('[TokenVerifier] issuer and audience are mandatory for high-integrity systems.');
    }

    this.options = {
      issuer: options.issuer,
      audience: options.audience,
      clockTolerance: options.clockTolerance?? 5,
     ...options,
      algorithms: [this.algorithm], // Force single algorithm
    };
  }

  _extractRawToken(tokenHeader) {
    if (!tokenHeader || typeof tokenHeader!== 'string' ||!tokenHeader.trim()) {
      throw new Error('Token required.');
    }
    const trimmed = tokenHeader.trim();
    return trimmed.toLowerCase().startsWith('bearer ')? trimmed.slice(7).trim() : trimmed;
  }

  async _getKey(header) {
    // SECURITY: Fail fast if header alg!= expected
    if (header.alg!== this.algorithm) {
      throw new Error(`Algorithm mismatch: expected ${this.algorithm}, got ${header.alg}`);
    }
    if (typeof this.keyResolver === 'function') {
      const key = await this.keyResolver(header);
      if (!key) throw new Error(`Unable to resolve key for kid: ${header.kid}`);
      return key;
    }
    return this.keyResolver;
  }

  async verify(token) {
    const cleanToken = this._extractRawToken(token);

    try {
      let key = this.keyResolver;
      if (typeof this.keyResolver === 'function') {
        const unverified = this.jwtProvider.decode(cleanToken, { complete: true });
        if (!unverified?.header?.kid) {
          throw new Error('Token header missing kid.');
        }
        key = await this._getKey(unverified.header);
      }

      const decoded = await this.jwtProvider.verify(cleanToken, key, this.options);

      if (!decoded?.sub) {
        throw new Error('Missing sub claim.');
      }
      if (!decoded.exp) {
        throw new Error('Missing exp claim.');
      }

      if (this.revocationStore) {
        const isRevoked = await this.revocationStore.isRevoked({
          jti: decoded.jti,
          userId: decoded.sub,
          iat: decoded.iat
        });
        if (isRevoked) {
          this.logger?.warn(`[TokenVerifier] Revoked token: user=${decoded.sub} jti=${decoded.jti}`);
          throw new Error('Revoked');
        }
      }

      return {
        userId: decoded.sub,
        roles: Array.isArray(decoded.roles)? decoded.roles : [],
        permissions: Array.isArray(decoded.permissions)? decoded.permissions : [],
        tenantId: decoded.tenantId?? null, // Single source of truth
        jti: decoded.jti?? null,
        rawPayload: decoded,
      };
    } catch (err) {
      // Log detailed, return generic
      this.logger?.error(`[TokenVerifier] Verify failed: ${err.message}`, {
        alg: this.algorithm,
        error: err.name
      });
      // Don't leak jwt library messages to client
      throw new Error('Authentication failed');
    }
  }
}

module.exports = TokenVerifier;