/**
 * @file domain/RefundReason.js
 * @description Value Object enforcing valid refund reason classification and constraints.
 */

const { InvalidRefundReasonError } = require('./RefundErrors');

const ALLOWED_CATEGORIES = Object.freeze([
  'DUPLICATE_CHARGE',
  'FRAUDULENT',
  'CUSTOMER_REQUEST',
  'SERVICE_DISRUPTION',
  'SYSTEM_ERROR',
  'OTHER',
]);

class RefundReason {
  /**
   * @param {Object} params
   * @param {string} params.category - Predefined refund classification
   * @param {string} [params.notes] - Optional detailed description (max 500 chars)
   */
  constructor({ category, notes = '' }) {
    if (!category || typeof category !== 'string' || !category.trim()) {
      throw new InvalidRefundReasonError('Category is required and must be a non-empty string.');
    }

    const normalizedCategory = category.toUpperCase().trim();
    if (!ALLOWED_CATEGORIES.includes(normalizedCategory)) {
      throw new InvalidRefundReasonError(
        `Invalid category '${category}'. Allowed categories are: [${ALLOWED_CATEGORIES.join(', ')}].`
      );
    }

    const trimmedNotes = typeof notes === 'string' ? notes.trim() : '';
    if (trimmedNotes.length > 500) {
      throw new InvalidRefundReasonError('Refund reason notes cannot exceed 500 characters.');
    }

    this._category = normalizedCategory;
    this._notes = trimmedNotes || null;

    Object.freeze(this);
  }

  get category() {
    return this._category;
  }

  get notes() {
    return this._notes;
  }

  /**
   * Value Object Equality Check
   * @param {RefundReason} other
   * @returns {boolean}
   */
  equals(other) {
    if (!(other instanceof RefundReason)) {
      return false;
    }
    return this._category === other.category && this._notes === other.notes;
  }

  /**
   * Reconstitutes Value Object from primitive database string or unstructured input.
   * Format: "CATEGORY: Notes..." OR "CATEGORY"
   * @param {string} rawReason
   * @returns {RefundReason}
   */
  static fromString(rawReason) {
    if (!rawReason || typeof rawReason !== 'string') {
      return new RefundReason({ category: 'OTHER' });
    }

    const [possibleCategory, ...notesParts] = rawReason.split(':');
    const categoryCandidate = possibleCategory.toUpperCase().trim();

    if (ALLOWED_CATEGORIES.includes(categoryCandidate)) {
      return new RefundReason({
        category: categoryCandidate,
        notes: notesParts.join(':').trim(),
      });
    }

    // Fallback for unstructured historical strings
    return new RefundReason({
      category: 'OTHER',
      notes: rawReason.slice(0, 500),
    });
  }

  /**
   * Formats Value Object into standard readable string.
   */
  toString() {
    return this._notes ? `${this._category}: ${this._notes}` : this._category;
  }

  /**
   * Standard JSON Serialization Hook (Express res.json / JSON.stringify)
   */
  toJSON() {
    return {
      category: this._category,
      notes: this._notes,
      formatted: this.toString(),
    };
  }

  /**
   * Returns list of allowed categories for UI metadata APIs / validation schemas
   */
  static get ALLOWED_CATEGORIES() {
    return ALLOWED_CATEGORIES;
  }
}

module.exports = RefundReason;