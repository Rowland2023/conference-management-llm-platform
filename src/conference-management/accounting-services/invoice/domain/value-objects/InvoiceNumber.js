// domain/value-objects/InvoiceNumber.js

export class InvoiceNumber {
  // Configurable format: e.g. INV-2026-000001, CONF-2026-000123
  static DEFAULT_REGEX = /^[A-Z0-9]+-\d{4}-\d{4,8}$/i;

  /**
   * @param {string|InvoiceNumber} value
   * @param {RegExp} [pattern]
   */
  constructor(value, pattern = InvoiceNumber.DEFAULT_REGEX) {
    const rawValue = value instanceof InvoiceNumber ? value.value : String(value || '').trim();

    if (!rawValue) {
      const error = new Error('Invoice number cannot be empty.');
      error.name = 'ValidationError';
      throw error;
    }

    if (pattern && !pattern.test(rawValue)) {
      const error = new Error(
        `Invalid invoice number format: "${rawValue}". Must match format like "INV-YYYY-XXXXXX".`
      );
      error.name = 'InvalidInvoiceNumberError';
      error.statusCode = 400;
      throw error;
    }

    this._value = rawValue.toUpperCase();
    Object.freeze(this);
  }

  get value() {
    return this._value;
  }

  // --- Sequence Decomposition Helpers ---

  /**
   * Extracts components assuming "PREFIX-YEAR-SEQUENCE" structure.
   */
  get parts() {
    const segments = this._value.split('-');
    if (segments.length >= 3) {
      return {
        prefix: segments[0],
        year: segments[1],
        sequence: segments[2],
      };
    }
    return { prefix: null, year: null, sequence: this._value };
  }

  // --- Static Factory Methods ---

  /**
   * Formats raw components into a standard InvoiceNumber
   * e.g. InvoiceNumber.format({ prefix: 'CONF', year: 2026, sequence: 42, padding: 6 }) => "CONF-2026-000042"
   */
  static format({ prefix = 'INV', year = new Date().getFullYear(), sequence, padding = 6 }) {
    if (sequence === undefined || sequence === null) {
      throw new Error('Sequence number is required to format an InvoiceNumber.');
    }

    const paddedSeq = String(sequence).padStart(padding, '0');
    const formatted = `${prefix.toUpperCase().trim()}-${year}-${paddedSeq}`;

    return new InvoiceNumber(formatted);
  }

  static from(value) {
    if (value instanceof InvoiceNumber) return value;
    return new InvoiceNumber(value);
  }

  // --- Equality & Serialization ---

  equals(other) {
    if (!other) return false;
    const otherVal = other instanceof InvoiceNumber ? other.value : String(other).trim().toUpperCase();
    return this._value === otherVal;
  }

  toString() {
    return this._value;
  }

  toJSON() {
    return this._value;
  }
}