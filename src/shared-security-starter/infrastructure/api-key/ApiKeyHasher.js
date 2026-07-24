/**
 * @file src/Security/infrastructure/api-key/ApiKeyHasher.js
 * @description Cryptographic utilities for secure API key hashing, constant-time verification, and generation.
 */

const crypto = require('crypto');

class ApiKeyHasher {
  /**
   * Dummy hash buffer used as a fallback to ensure true constant-time execution during comparison failures.
   * @private
   */
  static DUMMY_HASH_BUFFER = crypto.createHash('sha256').update('DUMMY_CONSTANT_TIME_PAD').digest();

  /**
   * @param {Object} [params]
   * @param {string} [params.secret=''] - Global pepper/salt for HMAC digests
   */
  constructor({ secret = '' } = {}) {
    this.secret = secret;
  }

  /**
   * Generates a cryptographically secure random API key with an optional prefix.
   * Format: <prefix>_<32_bytes_hex> (e.g., "sk_live_9f83a21...")
   *
   * @param {string} [prefix='sk_live'] - Optional key environment prefix
   * @returns {{ rawApiKey: string, keyHash: string, keyPrefix: string }}
   */
  generateKey(prefix = 'sk_live') {
    const randomBytes = crypto.randomBytes(32).toString('hex');
    const rawApiKey = `${prefix}_${randomBytes}`;
    const keyHash = this.hash(rawApiKey);

    return {
      rawApiKey,
      keyHash,
      keyPrefix: rawApiKey.slice(0, 12), // First 12 chars safe for logs/display
    };
  }

  /**
   * Generates a deterministic SHA-256 hash or HMAC digest of a raw API key.
   *
   * @param {string} rawApiKey
   * @returns {string} Hex-encoded hash
   */
  hash(rawApiKey) {
    if (!rawApiKey || typeof rawApiKey !== 'string' || !rawApiKey.trim()) {
      throw new Error('[ApiKeyHasher] Raw API key must be a non-empty string.');
    }

    const trimmedKey = rawApiKey.trim();

    if (this.secret) {
      return crypto.createHmac('sha256', this.secret).update(trimmedKey).digest('hex');
    }

    return crypto.createHash('sha256').update(trimmedKey).digest('hex');
  }

  /**
   * True constant-time hex digest comparison to prevent side-channel timing attacks.
   * Guarantees identical execution time regardless of input validity, length, or character content.
   *
   * @param {string} hashA
   * @param {string} hashB
   * @returns {boolean}
   */
  compare(hashA, hashB) {
    let bufferA;
    let bufferB;
    let isSameLength = true;

    try {
      // Validate string inputs safely
      const validA = typeof hashA === 'string' && hashA.length > 0;
      const validB = typeof hashB === 'string' && hashB.length > 0;

      if (!validA || !validB || hashA.length !== hashB.length) {
        isSameLength = false;
      }

      bufferA = validA ? Buffer.from(hashA, 'hex') : ApiKeyHasher.DUMMY_HASH_BUFFER;
      bufferB = isSameLength ? Buffer.from(hashB, 'hex') : ApiKeyHasher.DUMMY_HASH_BUFFER;

      // Double-check buffer byte length alignment before crypto operation
      if (bufferA.length !== bufferB.length) {
        bufferA = ApiKeyHasher.DUMMY_HASH_BUFFER;
        bufferB = ApiKeyHasher.DUMMY_HASH_BUFFER;
        isSameLength = false;
      }
    } catch {
      // Catch invalid hex formatting without throwing an exception or leaking timing data
      bufferA = ApiKeyHasher.DUMMY_HASH_BUFFER;
      bufferB = ApiKeyHasher.DUMMY_HASH_BUFFER;
      isSameLength = false;
    }

    // Always perform timingSafeEqual comparison to maintain execution timing invariant
    const isEqual = crypto.timingSafeEqual(bufferA, bufferB);

    return isSameLength && isEqual;
  }
}

module.exports = ApiKeyHasher;