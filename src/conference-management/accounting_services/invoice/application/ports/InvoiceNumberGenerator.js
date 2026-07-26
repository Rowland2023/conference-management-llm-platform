// application/ports/InvoiceNumberGenerator.js

/**
 * Interface contract for generating unique, human-readable invoice sequence numbers (e.g., INV-2026-00042).
 * Infrastructure implementations handle persistence-backed sequences or atomic locks.
 * 
 * @abstract
 */
export class InvoiceNumberGenerator {
  /**
   * Generates a unique, strictly sequential invoice reference number.
   * 
   * @param {Object} [context] Optional parameters (e.g., fiscalYear, organizationId, transaction context)
   * @param {number} [context.year] - Target calendar or fiscal year (defaults to current year)
   * @param {object} [context.trx] - Optional database transaction instance to maintain sequence lock
   * @returns {Promise<string>} e.g., "INV-2026-00042"
   */
  async generate(context = {}) {
    throw new Error('InvoiceNumberGenerator.generate() method not implemented');
  }
}