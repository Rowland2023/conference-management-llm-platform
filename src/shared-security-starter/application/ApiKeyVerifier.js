/**
 * @file src/shared-security-starter/application/ApiKeyVerifier.js
 * @description Staff-grade M2M API key verifier featuring constant-time verification,
 *              prefixed key resolution, and zero error-leakage boundaries.
 */

import crypto from "crypto";


export class ApiKeyVerifier {

  constructor({
    apiKeyRepository,
    secretSalt = "",
    logger = null
  }) {

    if (!apiKeyRepository) {
      throw new Error(
        "[ApiKeyVerifier] apiKeyRepository is required."
      );
    }

    this.apiKeyRepository = apiKeyRepository;
    this.secretSalt = secretSalt;
    this.logger = logger;

  }





  /**
   * Parses structured prefixed key:
   * ak_live_{keyId}_{secret}
   */
  _parseKeyComponents(rawApiKey) {

    if (
      typeof rawApiKey !== "string" ||
      !rawApiKey.trim()
    ) {
      throw new Error(
        "API key must be a non-empty string."
      );
    }


    const cleanKey =
      rawApiKey.trim();


    const parts =
      cleanKey.split("_");



    if (parts.length >= 4) {

      return {
        keyId: parts[2],
        secret: parts.slice(3).join("_"),
        fullKey: cleanKey,
      };

    }



    return {
      keyId: null,
      secret: cleanKey,
      fullKey: cleanKey,
    };

  }





  /**
   * Creates HMAC-SHA256 digest.
   */
  _hashSecret(secret) {

    return crypto
      .createHmac(
        "sha256",
        this.secretSalt
      )
      .update(secret)
      .digest("hex");

  }





  /**
   * Constant-time comparison.
   */
  _safeCompare(a, b) {

    if (
      typeof a !== "string" ||
      typeof b !== "string"
    ) {
      return false;
    }


    const bufA =
      Buffer.from(a);


    const bufB =
      Buffer.from(b);



    if (bufA.length !== bufB.length) {
      return false;
    }


    return crypto.timingSafeEqual(
      bufA,
      bufB
    );

  }





  /**
   * Verify incoming API key.
   */
  async verify(rawApiKey) {

    try {

      const {
        keyId,
        secret,
        fullKey
      } =
        this._parseKeyComponents(rawApiKey);



      const computedHash =
        this._hashSecret(fullKey);



      let record = null;



      if (
        keyId &&
        typeof this.apiKeyRepository.findByKeyId === "function"
      ) {

        record =
          await this.apiKeyRepository.findByKeyId(keyId);

      } else {

        record =
          await this.apiKeyRepository.findByHash(
            computedHash
          );

      }




      if (!record) {
        throw new Error("KEY_NOT_FOUND");
      }




      if (
        !this._safeCompare(
          computedHash,
          record.keyHash
        )
      ) {

        throw new Error(
          "INVALID_SECRET"
        );

      }





      if (record.isRevoked) {
        throw new Error(
          "KEY_REVOKED"
        );
      }





      if (
        record.expiresAt &&
        new Date(record.expiresAt) <= new Date()
      ) {

        throw new Error(
          "KEY_EXPIRED"
        );

      }





      if (
        Array.isArray(record.allowedIps) &&
        record.allowedIps.length > 0
      ) {

        // IP validation handled by middleware/context

      }





      this.logger?.debug?.(
        `[ApiKeyVerifier] Key authenticated for client: ${record.clientId}`
      );





      return {

        clientId:
          record.clientId,

        keyId:
          record.keyId || keyId,

        scopes:
          Array.isArray(record.scopes)
            ? record.scopes
            : [],

        rateLimitTier:
          record.rateLimitTier || "default",

        metadata:
          record.metadata || {},

      };



    } catch (error) {


      this.logger?.warn?.(
        `[ApiKeyVerifier] Authentication failed: ${error.message}`
      );



      // Prevent key enumeration attacks
      throw new Error(
        "Unauthorized: Invalid or expired API key."
      );

    }

  }

}