/**
 * @file domain/RefundStatus.js
 * @description Value Object and State Machine governing valid refund state transitions.
 */

const STATES = Object.freeze({
  REQUESTED: "REQUESTED",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  PROCESSING: "PROCESSING",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  REJECTED: "REJECTED",
});

// Explicit State Transition Map
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


class RefundStatus {

  constructor(status) {

    if (!Object.values(STATES).includes(status)) {
      throw new Error(
        `[RefundStatus] Invalid refund status: "${status}"`
      );
    }

    this.value = status;

    Object.freeze(this);
  }


  // Enum Expository Constants

  static get REQUESTED() {
    return STATES.REQUESTED;
  }

  static get PENDING_APPROVAL() {
    return STATES.PENDING_APPROVAL;
  }

  static get PROCESSING() {
    return STATES.PROCESSING;
  }

  static get COMPLETED() {
    return STATES.COMPLETED;
  }

  static get FAILED() {
    return STATES.FAILED;
  }

  static get REJECTED() {
    return STATES.REJECTED;
  }


  /**
   * Asserts whether transitioning to a target state is valid.
   *
   * @param {string} nextStatus
   * @returns {boolean}
   */
  canTransitionTo(nextStatus) {

    const allowed =
      VALID_TRANSITIONS[this.value] || [];

    return allowed.includes(nextStatus);
  }


  /**
   * Enforces transition rules and returns a new status instance.
   *
   * @param {string} nextStatus
   * @returns {RefundStatus}
   */
  transitionTo(nextStatus) {

    if (!this.canTransitionTo(nextStatus)) {
      throw new Error(
        `[RefundStatus] Invalid transition from "${this.value}" to "${nextStatus}".`
      );
    }

    return new RefundStatus(nextStatus);
  }


  /**
   * Checks if the current state is final/immutable.
   *
   * @returns {boolean}
   */
  isTerminal() {

    return [
      STATES.COMPLETED,
      STATES.REJECTED,
    ].includes(this.value);
  }


  equals(other) {

    if (other instanceof RefundStatus) {
      return this.value === other.value;
    }

    return this.value === other;
  }


  toString() {

    return this.value;
  }

}


// Preserve enum-style compatibility
// Usage:
// RefundStatus.REQUESTED
// RefundStatus.PROCESSING
Object.assign(
  RefundStatus,
  STATES
);


export default RefundStatus;