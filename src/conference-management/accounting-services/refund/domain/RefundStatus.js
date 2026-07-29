/**
 * @file domain/RefundStatus.js
 * @description Value Object representing the lifecycle of a refund.
 */

const STATES = Object.freeze({
  REQUESTED: "REQUESTED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REJECTED: "REJECTED",
});

const VALID_TRANSITIONS = Object.freeze({
  [STATES.REQUESTED]: [
    STATES.PENDING_APPROVAL,
    STATES.PROCESSING,
    STATES.REJECTED,
    STATES.FAILED,
  ],

  [STATES.PENDING_APPROVAL]: [
    STATES.PROCESSING,
    STATES.REJECTED,
    STATES.FAILED,
  ],

  [STATES.PROCESSING]: [
    STATES.COMPLETED,
    STATES.FAILED,
  ],

  [STATES.COMPLETED]: [],

  [STATES.FAILED]: [
    STATES.PROCESSING,
  ],

  [STATES.REJECTED]: [],
});

export class RefundStatus {

  constructor(value) {

    if (!Object.values(STATES).includes(value)) {

      throw new Error(
        `[RefundStatus] Invalid refund status "${value}".`
      );

    }

    this.value = value;

    Object.freeze(this);

  }

  /**
   * Factory methods
   */

  static get REQUESTED() {
    return new RefundStatus(STATES.REQUESTED);
  }

  static get PENDING_APPROVAL() {
    return new RefundStatus(STATES.PENDING_APPROVAL);
  }

  static get PROCESSING() {
    return new RefundStatus(STATES.PROCESSING);
  }

  static get COMPLETED() {
    return new RefundStatus(STATES.COMPLETED);
  }

  static get FAILED() {
    return new RefundStatus(STATES.FAILED);
  }

  static get REJECTED() {
    return new RefundStatus(STATES.REJECTED);
  }

  /**
   * Construct from persisted value.
   */

  static from(value) {
    return new RefundStatus(value);
  }

  /**
   * Returns every valid state.
   */

  static values() {
    return Object.values(STATES);
  }

  /**
   * Determines whether this status can transition.
   */

  canTransitionTo(nextStatus) {

    const target =
      nextStatus instanceof RefundStatus
        ? nextStatus.value
        : nextStatus;

    const allowed =
      VALID_TRANSITIONS[this.value] ?? [];

    return allowed.includes(target);

  }

  /**
   * Returns a new status after validation.
   */

  transitionTo(nextStatus) {

    const target =
      nextStatus instanceof RefundStatus
        ? nextStatus.value
        : nextStatus;

    if (!this.canTransitionTo(target)) {

      throw new Error(
        `[RefundStatus] Invalid transition from "${this.value}" to "${target}".`
      );

    }

    return new RefundStatus(target);

  }

  /**
   * Whether the refund can no longer change state.
   */

  isTerminal() {

    return [

      STATES.COMPLETED,

      STATES.REJECTED,

    ].includes(this.value);

  }

  equals(other) {

    if (!(other instanceof RefundStatus)) {

      return false;

    }

    return this.value === other.value;

  }

  toString() {
    return this.value;
  }

  toJSON() {
    return this.value;
  }

}

export default RefundStatus;