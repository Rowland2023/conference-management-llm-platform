/**
 * @file src/domain/value-objects/idempotency-key.vo.js
 *
 * Immutable Value Object representing an Idempotency Key.
 * Prevents duplicate command execution and guarantees safe retries.
 */

import { randomUUID } from "node:crypto";

import {
  InvalidArgumentError,
} from "../error/index.js";

// Safe set: Alphanumeric, hyphens, underscores, colons, and periods.
const IDEMPOTENCY_KEY_REGEX =
  /^[a-zA-Z0-9_.:-]+$/;

export default class IdempotencyKey {

  /**
   * @param {string} value
   */
  constructor(value) {

    if (
      !value ||
      typeof value !== "string"
    ) {
      throw new InvalidArgumentError(
        "IdempotencyKey must be a non-empty string."
      );
    }

    const normalized =
      value.trim();

    if (
      normalized.length < 8 ||
      normalized.length > 128
    ) {
      throw new InvalidArgumentError(
        "IdempotencyKey length must be between 8 and 128 characters."
      );
    }

    if (
      !IDEMPOTENCY_KEY_REGEX.test(
        normalized
      )
    ) {
      throw new InvalidArgumentError(
        "IdempotencyKey contains invalid characters."
      );
    }

    this._value =
      normalized;

    Object.freeze(this);
  }

  //---------------------------------------------------------
  // Getters
  //---------------------------------------------------------

  get value() {
    return this._value;
  }

  //---------------------------------------------------------
  // Factory Methods
  //---------------------------------------------------------

  /**
   * Generates a cryptographically secure UUIDv4.
   *
   * @returns {IdempotencyKey}
   */
  static generate() {
    return new IdempotencyKey(
      randomUUID()
    );
  }

  /**
   * Creates an instance from either a raw string
   * or another IdempotencyKey.
   *
   * @param {string|IdempotencyKey} input
   * @returns {IdempotencyKey}
   */
  static from(input) {

    if (
      input instanceof
      IdempotencyKey
    ) {
      return input;
    }

    return new IdempotencyKey(
      input
    );
  }

  //---------------------------------------------------------
  // Equality
  //---------------------------------------------------------

  /**
   * Structural equality.
   *
   * @param {IdempotencyKey|string} other
   * @returns {boolean}
   */
  equals(other) {

    if (
      other instanceof
      IdempotencyKey
    ) {
      return (
        this._value ===
        other.value
      );
    }

    if (
      typeof other ===
      "string"
    ) {
      return (
        this._value ===
        other.trim()
      );
    }

    return false;
  }

  //---------------------------------------------------------
  // Serialization
  //---------------------------------------------------------

  toJSON() {
    return this._value;
  }

  toString() {
    return this._value;
  }

}