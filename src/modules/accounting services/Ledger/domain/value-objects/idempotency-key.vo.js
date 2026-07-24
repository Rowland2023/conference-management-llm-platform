/**
 * @file src/domain/value-objects/idempotency-key.vo.js
 * 
 * Immutable Value Object representing an Idempotency Key.
 * Prevents double-posting and guarantees safe client execution retries.
 */
const crypto = require('crypto');
const { InvalidArgumentError } = require('../errors');

// Safe set: Alphanumeric, hyphens, underscores, colons, and periods.
const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_\-.:]+$/;

class IdempotencyKey {
  /**
   * @param {string} value 
   */
  constructor(value) {
    if (!value || typeof value !== 'string') {
      throw new InvalidArgumentError('IdempotencyKey: must be a non-empty string');
    }

    const trimmed = value.trim();

    if (trimmed.length < 8 || trimmed.length > 128) {
      throw new InvalidArgumentError('IdempotencyKey: length must be between 8 and 128 characters');
    }

    if (!IDEMPOTENCY_KEY_REGEX.test(trimmed)) {
      throw new InvalidArgumentError(
        'IdempotencyKey: contains invalid characters. Only alphanumeric, hyphen, underscore, colon, and period are permitted'
      );
    }

    this._value = trimmed;
    Object.freeze(this); // Immutability guarantee
  }

  get value() {
    return this._value;
  }

  /**
   * Generates a cryptographically strong UUIDv4 IdempotencyKey.
   * Useful for internal saga steps, background jobs, or synthetic retries.
   * @returns {IdempotencyKey}
   */
  static generate() {
    return new IdempotencyKey(crypto.randomUUID());
  }

  /**
   * Creates an IdempotencyKey instance from raw input safely.
   * @param {string|IdempotencyKey} input 
   * @returns {IdempotencyKey}
   */
  static from(input) {
    if (input instanceof IdempotencyKey) return input;
    return new IdempotencyKey(input);
  }

  /**
   * Compares two IdempotencyKey instances for structural equality.
   * @param {any} other 
   * @returns {boolean}
   */
  equals(other) {
    if (other instanceof IdempotencyKey) {
      return this._value === other.value;
    }
    if (typeof other === 'string') {
      return this._value === other.trim();
    }
    return false;
  }

  /**
   * Guarantees clean serialization during JSON.stringify()
   * @returns {string}
   */
  toJSON() {
    return this._value;
  }

  toString() {
    return this._value;
  }
}

module.exports = IdempotencyKey;