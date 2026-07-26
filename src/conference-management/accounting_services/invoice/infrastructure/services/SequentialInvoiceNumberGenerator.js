// infrastructure/services/SequentialInvoiceNumberGenerator.js
import { InvoiceNumberGenerator } from '../../application/ports/InvoiceNumberGenerator.js';

export class SequentialInvoiceNumberGenerator extends InvoiceNumberGenerator {
  /**
   * @param {import('knex').Knex} db - Knex database connection instance
   * @param {Object} [options]
   * @param {string} [options.prefix='INV'] - Document prefix (e.g., 'INV', 'CONF-INV')
   * @param {number} [options.padding=5] - Zero-padding digits (e.g., 5 -> "00042")
   * @param {string} [options.sequenceName='invoice_number_seq'] - Target PG sequence
   */
  constructor(db, { prefix = 'INV', padding = 5, sequenceName = 'invoice_number_seq' } = {}) {
    super();
    this.db = db;
    this.prefix = String(prefix).toUpperCase().trim();
    this.padding = padding;
    this.sequenceName = sequenceName;
  }

  /**
   * Generates a collision-safe, formatted sequential invoice number (e.g., "INV-2026-00042")
   * Uses PostgreSQL sequence for atomic thread safety.
   *
   * @param {import('knex').Knex.Transaction} [trx] - Optional Knex transaction context
   * @returns {Promise<string>}
   */
  async generate(trx) {
    const knex = trx || this.db;

    try {
      // Atomically fetch next sequence value
      const result = await knex.raw("SELECT nextval(?) AS seq", [this.sequenceName]);
      
      const rawSeq = result.rows?.[0]?.seq || result?.[0]?.seq;
      if (!rawSeq) {
        throw new Error(`Failed to retrieve value from sequence "${this.sequenceName}".`);
      }

      const year = new Date().getFullYear();
      const paddedSequence = String(rawSeq).padStart(this.padding, '0');

      return `${this.prefix}-${year}-${paddedSequence}`;
    } catch (error) {
      throw new Error(
        `[SequentialInvoiceNumberGenerator] Error generating invoice number: ${error.message}`
      );
    }
  }
}