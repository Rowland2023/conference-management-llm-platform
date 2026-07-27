// infrastructure/repositories/PostgresInvoiceRepository.js
import { InvoiceRepository } from '../../application/ports/InvoiceRepository.js';
import { Invoice } from '../../domain/entities/Invoice.js';
import { InvoiceLineItem } from '../../domain/entities/InvoiceLineItem.js';
import { Money } from '../../domain/value-objects/Money.js';
import { InvoiceStatus } from '../../domain/value-objects/InvoiceStatus.js';
import { InvoiceNumber } from '../../domain/value-objects/InvoiceNumber.js';

export class PostgresInvoiceRepository extends InvoiceRepository {
  /**
   * @param {import('knex').Knex} db - Knex database connection instance
   */
  constructor(db) {
    super();
    this.db = db;
  }

  /**
   * Insert a new Invoice aggregate into PostgreSQL
   */
  async save(invoiceAggregate, trx) {
    const knex = trx || this.db;

    const [invoiceRow] = await knex('conference_invoices')
      .insert({
        id: invoiceAggregate.id || undefined,
        invoice_number: invoiceAggregate.invoiceNumber.value,
        conference_name: invoiceAggregate.conferenceName,
        client_name: invoiceAggregate.clientName,
        client_email: invoiceAggregate.clientEmail,
        client_address: invoiceAggregate.clientAddress,
        issue_date: invoiceAggregate.issueDate,
        due_date: invoiceAggregate.dueDate,
        event_start_date: invoiceAggregate.eventStartDate,
        event_end_date: invoiceAggregate.eventEndDate,
        status: invoiceAggregate.status.value,
        tax_rate: invoiceAggregate.taxRate.toString(),
        deposit_paid: invoiceAggregate.depositPaid.toFixed(),
        subtotal: invoiceAggregate.subtotal.toFixed(),
        tax_amount: invoiceAggregate.taxAmount.toFixed(),
        total_amount_due: invoiceAggregate.totalAmountDue.toFixed(),
      })
      .returning('*');

    let lineItemRows = [];
    if (invoiceAggregate.items.length > 0) {
      const lineItemsToInsert = invoiceAggregate.items.map((item) => ({
        invoice_id: invoiceRow.id,
        category: item.category,
        description: item.description,
        quantity: item.quantity.toString(),
        unit_price: item.unitPrice.toFixed(),
        total_price: item.totalPrice.toFixed(),
      }));

      lineItemRows = await knex('invoice_line_items')
        .insert(lineItemsToInsert)
        .returning('*');
    }

    return this._toDomain(invoiceRow, lineItemRows);
  }

  /**
   * Update an existing Invoice aggregate (e.g., status changes or recorded payments)
   */
  async update(invoiceAggregate, trx) {
    const knex = trx || this.db;

    const [updatedRow] = await knex('conference_invoices')
      .where({ id: invoiceAggregate.id })
      .update({
        status: invoiceAggregate.status.value,
        tax_rate: invoiceAggregate.taxRate.toString(),
        deposit_paid: invoiceAggregate.depositPaid.toFixed(),
        subtotal: invoiceAggregate.subtotal.toFixed(),
        tax_amount: invoiceAggregate.taxAmount.toFixed(),
        total_amount_due: invoiceAggregate.totalAmountDue.toFixed(),
        updated_at: knex.fn.now(),
      })
      .returning('*');

    if (!updatedRow) {
      throw new Error(`Failed to update: Invoice with ID ${invoiceAggregate.id} not found.`);
    }

    const lineItemRows = await knex('invoice_line_items')
      .where({ invoice_id: updatedRow.id });

    return this._toDomain(updatedRow, lineItemRows);
  }

  /**
   * Find single Invoice aggregate by ID
   */
  async findById(id, trx) {
    const knex = trx || this.db;

    const invoiceRow = await knex('conference_invoices')
      .where({ id })
      .first();

    if (!invoiceRow) return null;

    const lineItemRows = await knex('invoice_line_items')
      .where({ invoice_id: id });

    return this._toDomain(invoiceRow, lineItemRows);
  }

  /**
   * Find single Invoice aggregate by Invoice Number
   */
  async findByInvoiceNumber(invoiceNumber, trx) {
    const knex = trx || this.db;

    const invoiceRow = await knex('conference_invoices')
      .where({ invoice_number: invoiceNumber })
      .first();

    if (!invoiceRow) return null;

    const lineItemRows = await knex('invoice_line_items')
      .where({ invoice_id: invoiceRow.id });

    return this._toDomain(invoiceRow, lineItemRows);
  }

  /**
   * Data Mapper: Converts raw database rows into rich DDD Domain Aggregate
   */
  _toDomain(invoiceRow, lineItemRows = []) {
    const items = lineItemRows.map(
      (row) =>
        new InvoiceLineItem({
          id: row.id,
          category: row.category,
          description: row.description,
          quantity: row.quantity,
          unitPrice: new Money(row.unit_price),
        })
    );

    return new Invoice({
      id: invoiceRow.id,
      invoiceNumber: new InvoiceNumber(invoiceRow.invoice_number),
      conferenceName: invoiceRow.conference_name,
      clientName: invoiceRow.client_name,
      clientEmail: invoiceRow.client_email,
      clientAddress: invoiceRow.client_address,
      issueDate: invoiceRow.issue_date,
      dueDate: invoiceRow.due_date,
      eventStartDate: invoiceRow.event_start_date,
      eventEndDate: invoiceRow.event_end_date,
      taxRate: invoiceRow.tax_rate,
      depositPaid: new Money(invoiceRow.deposit_paid),
      status: new InvoiceStatus(invoiceRow.status),
      items,
    });
  }
}