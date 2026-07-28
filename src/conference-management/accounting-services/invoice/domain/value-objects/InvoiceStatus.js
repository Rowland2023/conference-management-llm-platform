// domain/value-objects/InvoiceStatus.js

export class InvoiceStatus {
  // ------------------------------------------------------------------
  // Static Constants (must be initialized BEFORE static instances)
  // ------------------------------------------------------------------

  static VALID_STATUSES = Object.freeze([
    "DRAFT",
    "ISSUED",
    "PARTIALLY_PAID",
    "PAID",
    "CANCELLED",
  ]);

  /**
   * Defines allowable state transition paths
   */
  static ALLOWED_TRANSITIONS = Object.freeze({
    DRAFT: ["ISSUED", "CANCELLED"],
    ISSUED: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
    PARTIALLY_PAID: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
    PAID: [],       // Terminal state
    CANCELLED: [],  // Terminal state
  });

  // ------------------------------------------------------------------
  // Static Singleton Instances
  // ------------------------------------------------------------------

  static DRAFT = new InvoiceStatus("DRAFT");
  static ISSUED = new InvoiceStatus("ISSUED");
  static PARTIALLY_PAID = new InvoiceStatus("PARTIALLY_PAID");
  static PAID = new InvoiceStatus("PAID");
  static CANCELLED = new InvoiceStatus("CANCELLED");

  /**
   * @param {string|InvoiceStatus} value
   */
  constructor(value) {
    const rawValue =
      value instanceof InvoiceStatus
        ? value.value
        : String(value).toUpperCase().trim();

    if (!InvoiceStatus.VALID_STATUSES.includes(rawValue)) {
      const error = new Error(
        `Invalid invoice status: "${value}". Must be one of: ${InvoiceStatus.VALID_STATUSES.join(", ")}`
      );
      error.name = "InvalidInvoiceStatusError";
      throw error;
    }

    this._value = rawValue;

    Object.freeze(this);
  }

  get value() {
    return this._value;
  }

  // ------------------------------------------------------------------
  // Predicate Helpers
  // ------------------------------------------------------------------

  get isDraft() {
    return this._value === "DRAFT";
  }

  get isIssued() {
    return this._value === "ISSUED";
  }

  get isPartiallyPaid() {
    return this._value === "PARTIALLY_PAID";
  }

  get isPaid() {
    return this._value === "PAID";
  }

  get isCancelled() {
    return this._value === "CANCELLED";
  }

  get isTerminal() {
    return this.isPaid || this.isCancelled;
  }

  // ------------------------------------------------------------------
  // State Machine
  // ------------------------------------------------------------------

  /**
   * @param {string|InvoiceStatus} nextStatus
   * @returns {boolean}
   */
  canTransitionTo(nextStatus) {
    const target =
      nextStatus instanceof InvoiceStatus
        ? nextStatus.value
        : String(nextStatus).toUpperCase().trim();

    const allowed = InvoiceStatus.ALLOWED_TRANSITIONS[this._value] ?? [];

    return allowed.includes(target);
  }

  /**
   * @param {string|InvoiceStatus} nextStatus
   */
  assertCanTransitionTo(nextStatus) {
    const target =
      nextStatus instanceof InvoiceStatus
        ? nextStatus.value
        : String(nextStatus).toUpperCase().trim();

    if (!this.canTransitionTo(target)) {
      const error = new Error(
        `Cannot transition invoice status from "${this._value}" to "${target}".`
      );
      error.name = "DomainRuleViolationError";
      error.statusCode = 400;
      throw error;
    }
  }

  // ------------------------------------------------------------------
  // Equality & Serialization
  // ------------------------------------------------------------------

  equals(other) {
    if (!other) return false;

    const otherValue =
      other instanceof InvoiceStatus
        ? other.value
        : String(other).toUpperCase().trim();

    return this._value === otherValue;
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }

  static from(value) {
    return value instanceof InvoiceStatus
      ? value
      : new InvoiceStatus(value);
  }
}