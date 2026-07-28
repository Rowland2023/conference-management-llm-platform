/**
 * @file src/domain/aggregates/journal-entry/entry-status.vo.js
 */

import {
  InvalidArgumentError,
  InvalidStateTransitionError,
} from "../../error/index.js";

export default class EntryStatus {
  static PENDING = "PENDING";
  static POSTED = "POSTED";
  static REVERSED = "REVERSED";

  static VALID_STATUSES = Object.freeze([
    EntryStatus.PENDING,
    EntryStatus.POSTED,
    EntryStatus.REVERSED,
  ]);

  // Allowed state transition matrix for financial auditability
  static ALLOWED_TRANSITIONS = Object.freeze({
    [EntryStatus.PENDING]: Object.freeze([
      EntryStatus.POSTED,
      EntryStatus.REVERSED,
    ]),
    [EntryStatus.POSTED]: Object.freeze([
      EntryStatus.REVERSED,
    ]),
    [EntryStatus.REVERSED]: Object.freeze([]),
  });

  /**
   * @param {string|EntryStatus} [value=EntryStatus.POSTED]
   */
  constructor(value = EntryStatus.POSTED) {
    const rawValue =
      value instanceof EntryStatus
        ? value.value
        : value;

    const formatted = rawValue
      ?.toString()
      .trim()
      .toUpperCase();

    if (
      !EntryStatus.VALID_STATUSES.includes(
        formatted
      )
    ) {
      throw new InvalidArgumentError(
        `Invalid entry status: '${value}'. Valid options: ${EntryStatus.VALID_STATUSES.join(
          ", "
        )}`
      );
    }

    this._value = formatted;

    Object.freeze(this);
  }

  get value() {
    return this._value;
  }

  // ---------- Static Factory Helpers ----------

  static pending() {
    return new EntryStatus(EntryStatus.PENDING);
  }

  static posted() {
    return new EntryStatus(EntryStatus.POSTED);
  }

  static reversed() {
    return new EntryStatus(EntryStatus.REVERSED);
  }

  // ---------- Queries ----------

  isPending() {
    return this._value === EntryStatus.PENDING;
  }

  isPosted() {
    return this._value === EntryStatus.POSTED;
  }

  isReversed() {
    return this._value === EntryStatus.REVERSED;
  }

  /**
   * @param {EntryStatus|string} nextStatus
   * @returns {boolean}
   */
  canTransitionTo(nextStatus) {
    if (!nextStatus) {
      return false;
    }

    const target =
      nextStatus instanceof EntryStatus
        ? nextStatus.value
        : nextStatus
            .toString()
            .trim()
            .toUpperCase();

    return (
      EntryStatus.ALLOWED_TRANSITIONS[
        this._value
      ]?.includes(target) ?? false
    );
  }

  /**
   * @param {EntryStatus|string} nextStatus
   */
  assertCanTransitionTo(nextStatus) {
    if (!this.canTransitionTo(nextStatus)) {
      const target =
        nextStatus instanceof EntryStatus
          ? nextStatus.value
          : nextStatus;

      throw new InvalidStateTransitionError(
        `Cannot transition Journal Entry status from '${this._value}' to '${target}'`
      );
    }
  }

  /**
   * @param {EntryStatus|string} other
   * @returns {boolean}
   */
  equals(other) {
    if (!other) {
      return false;
    }

    if (other instanceof EntryStatus) {
      return this._value === other.value;
    }

    return (
      typeof other === "string" &&
      this._value ===
        other.trim().toUpperCase()
    );
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}