// application/ports/InvoiceRepository.js

/**
 * Interface contract for Invoice persistence.
 * Infrastructure implementations (e.g., KnexInvoiceRepository) must implement these methods.
 * 
 * @abstract
 */
export class InvoiceRepository {
  /**
   * Persists a new ConferenceInvoice domain aggregate along with its line items
   * and any uncommitted domain events (outbox pattern).
   * 
   * @param {import('../../domain/entities/ConferenceInvoice.js').ConferenceInvoice} invoiceAggregate
   * @param {object} [trx] Optional transaction handle / unit-of-work
   * @returns {Promise<import('../../domain/entities/ConferenceInvoice.js').ConferenceInvoice>}
   */
  async save(invoiceAggregate, trx) {
    throw new Error('InvoiceRepository.save() method not implemented');
  }

  /**
   * Retrieves an Invoice domain aggregate by its primary UUID key.
   * Reconstitutes database rows into a fully formed domain entity.
   * 
   * @param {string} id
   * @param {object} [trx] Optional transaction handle / unit-of-work
   * @returns {Promise<import('../../domain/entities/ConferenceInvoice.js').ConferenceInvoice|null>}
   */
  async findById(id, trx) {
    throw new Error('InvoiceRepository.findById() method not implemented');
  }

  /**
   * Retrieves an Invoice domain aggregate by its formatted reference number (e.g., INV-2026-00012).
   * 
   * @param {string} invoiceNumber
   * @param {object} [trx] Optional transaction handle / unit-of-work
   * @returns {Promise<import('../../domain/entities/ConferenceInvoice.js').ConferenceInvoice|null>}
   */
  async findByInvoiceNumber(invoiceNumber, trx) {
    throw new Error('InvoiceRepository.findByInvoiceNumber() method not implemented');
  }

  /**
   * Updates an existing ConferenceInvoice aggregate root (e.g., status changes, deposit updates).
   * 
   * @param {import('../../domain/entities/ConferenceInvoice.js').ConferenceInvoice} invoiceAggregate
   * @param {object} [trx] Optional transaction handle / unit-of-work
   * @returns {Promise<import('../../domain/entities/ConferenceInvoice.js').ConferenceInvoice>}
   */
  async update(invoiceAggregate, trx) {
    throw new Error('InvoiceRepository.update() method not implemented');
  }
}