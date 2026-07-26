// domain/entities/Invoice.js
import { InvoiceStatus } from '../value-objects/InvoiceStatus.js';
import { InvoiceNumber } from '../value-objects/InvoiceNumber.js';
import { Money } from '../value-objects/Money.js';
import { InvoiceLineItem } from './InvoiceLineItem.js';
import { InvoiceIssued } from '../events/InvoiceIssued.js';
import { InvoicePaid } from '../events/InvoicePaid.js';
import BigNumber from 'bignumber.js';

export class Invoice {
  /**
   * @param {Object} params
   */
  constructor({
    id = null,
    invoiceNumber,
    conferenceName,
    clientName,
    clientEmail,
    clientAddress = '',
    issueDate = new Date(),
    dueDate,
    eventStartDate = null,
    eventEndDate = null,
    taxRate = 7.50,
    depositPaid = null,
    status = InvoiceStatus.DRAFT,
    currency = 'NGN',
    items = [],
    payments = [],
    cancellationReason = null,
  }) {
    if (!conferenceName || !clientName || !clientEmail) {
      throw new Error('Invoice requires conferenceName, clientName, and clientEmail.');
    }

    this.id = id || crypto.randomUUID();
    this.invoiceNumber = InvoiceNumber.from(invoiceNumber);
    this.conferenceName = String(conferenceName).trim();
    this.clientName = String(clientName).trim();
    this.clientEmail = String(clientEmail).trim();
    this.clientAddress = String(clientAddress).trim();

    this.issueDate = issueDate instanceof Date ? issueDate : new Date(issueDate);
    this.dueDate = dueDate ? (dueDate instanceof Date ? dueDate : new Date(dueDate)) : null;
    this.eventStartDate = eventStartDate ? new Date(eventStartDate) : null;
    this.eventEndDate = eventEndDate ? new Date(eventEndDate) : null;

    this.currency = String(currency).toUpperCase();
    this.taxRate = new BigNumber(taxRate);

    // Hydrate line items into proper entities
    this.items = items.map((item) =>
      item instanceof InvoiceLineItem ? item : InvoiceLineItem.from({ ...item, currency: this.currency })
    );

    this.depositPaid = depositPaid
      ? depositPaid instanceof Money ? depositPaid : new Money(depositPaid, this.currency)
      : Money.zero(this.currency);

    this.status = InvoiceStatus.from(status);
    this.payments = payments;
    this.cancellationReason = cancellationReason;

    this._domainEvents = [];

    // Derive totals
    this._calculateTotals();
  }

  // --- Domain Event Handling ---

  get domainEvents() {
    return [...this._domainEvents];
  }

  addDomainEvent(event) {
    this._domainEvents.push(event);
  }

  clearDomainEvents() {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  // --- Financial Calculations ---

  /**
   * Internal financial calculation using Money Value Objects & BigNumber precision
   */
  _calculateTotals() {
    // 1. Calculate Subtotal from Line Items
    this.subtotal = this.items.reduce(
      (acc, item) => acc.add(item.totalPrice),
      Money.zero(this.currency)
    );

    // 2. Calculate Tax Amount
    const taxFactor = this.taxRate.dividedBy(100);
    this.taxAmount = new Money(
      this.subtotal.amount.multipliedBy(taxFactor),
      this.currency
    );

    // 3. Gross Total = Subtotal + Tax
    this.grossTotal = this.subtotal.add(this.taxAmount);

    // 4. Calculate total paid via payment ledger
    const totalPaymentsReceived = (this.payments || []).reduce(
      (acc, p) => acc.add(new Money(p.amount, this.currency)),
      Money.zero(this.currency)
    );

    // Total deductions = Initial Deposit + Subsequent Payments
    const totalDeductions = this.depositPaid.add(totalPaymentsReceived);

    // 5. Remaining Balance
    if (totalDeductions.amount.isGreaterThanOrEqualTo(this.grossTotal.amount)) {
      this.totalAmountDue = Money.zero(this.currency);
    } else {
      this.totalAmountDue = this.grossTotal.subtract(totalDeductions);
    }
  }

  // --- Aggregate Mutations ---

  /**
   * Appends line item to invoice (DRAFT state only)
   */
  addLineItem(itemData) {
    if (!this.status.isDraft) {
      throw new Error('Line items can only be modified on DRAFT invoices.');
    }

    const newItem = InvoiceLineItem.from({ ...itemData, currency: this.currency });
    this.items.push(newItem);
    this._calculateTotals();
    return newItem;
  }

  // --- Domain State Transitions ---

  /**
   * Issue Invoice
   */
  issue({ issuedBy = null, correlationId = null } = {}) {
    this.status.assertCanTransitionTo(InvoiceStatus.ISSUED);

    if (this.items.length === 0) {
      throw new Error('Cannot issue an invoice without at least one line item.');
    }

    this.status = InvoiceStatus.ISSUED;

    this.addDomainEvent(
      new InvoiceIssued({
        invoiceId: this.id,
        invoiceNumber: this.invoiceNumber.value,
        clientEmail: this.clientEmail,
        totalAmountDue: this.totalAmountDue.toFixed(),
        currency: this.currency,
        issuedBy,
        correlationId,
      })
    );
  }

  /**
   * Record Payment against Invoice
   */
  recordPayment(amount, { reference = null, paymentMethod = 'CARD', correlationId = null } = {}) {
    const payment = amount instanceof Money ? amount : new Money(amount, this.currency);

    if (this.status.isTerminal) {
      throw new Error(`Cannot apply payment to an invoice in terminal status: "${this.status.value}".`);
    }

    if (!payment.isGreaterThanZero()) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (payment.isGreaterThan(this.totalAmountDue)) {
      throw new Error(
        `Payment amount (${payment.toFixed()}) exceeds remaining total due (${this.totalAmountDue.toFixed()}).`
      );
    }

    const paymentEntry = {
      id: crypto.randomUUID(),
      amount: payment.toFixed(),
      reference,
      paymentMethod,
      paidAt: new Date().toISOString(),
    };

    this.payments.push(paymentEntry);
    this._calculateTotals();

    const isFullyPaid = this.totalAmountDue.isZero();
    const targetStatus = isFullyPaid ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

    this.status.assertCanTransitionTo(targetStatus);
    this.status = targetStatus;

    this.addDomainEvent(
      new InvoicePaid({
        invoiceId: this.id,
        invoiceNumber: this.invoiceNumber.value,
        amountPaid: payment.toFixed(),
        remainingBalance: this.totalAmountDue.toFixed(),
        isFullyPaid,
        reference,
        paymentMethod,
        currency: this.currency,
        correlationId,
      })
    );

    return paymentEntry;
  }

  /**
   * Cancel Invoice
   */
  cancel(reason, { cancelledBy = null } = {}) {
    if (!reason || !String(reason).trim()) {
      throw new Error('A cancellation reason is required to cancel an invoice.');
    }

    this.status.assertCanTransitionTo(InvoiceStatus.CANCELLED);

    this.status = InvoiceStatus.CANCELLED;
    this.cancellationReason = String(reason).trim();
    this.cancelledAt = new Date();
    this.cancelledBy = cancelledBy;
  }

  // --- Serialization ---

  toJSON() {
    return {
      id: this.id,
      invoiceNumber: this.invoiceNumber.value,
      conferenceName: this.conferenceName,
      clientName: this.clientName,
      clientEmail: this.clientEmail,
      clientAddress: this.clientAddress,
      issueDate: this.issueDate.toISOString(),
      dueDate: this.dueDate ? this.dueDate.toISOString() : null,
      eventStartDate: this.eventStartDate ? this.eventStartDate.toISOString() : null,
      eventEndDate: this.eventEndDate ? this.eventEndDate.toISOString() : null,
      taxRate: this.taxRate.toNumber(),
      currency: this.currency,
      subtotal: this.subtotal.toFixed(),
      taxAmount: this.taxAmount.toFixed(),
      grossTotal: this.grossTotal.toFixed(),
      depositPaid: this.depositPaid.toFixed(),
      totalAmountDue: this.totalAmountDue.toFixed(),
      status: this.status.value,
      items: this.items.map((i) => i.toJSON()),
      payments: this.payments,
      cancellationReason: this.cancellationReason,
    };
  }
}