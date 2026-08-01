// src/conference-management/accounting-services/invoice/domain/ConferenceInvoice.js

import { randomUUID } from "node:crypto";

export const InvoiceStatus = Object.freeze({
  DRAFT: "DRAFT",
  PENDING: "PENDING",
  PAID: "PAID",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  CANCELLED: "CANCELLED",
  VOIDED: "VOIDED",
  OVERDUE: "OVERDUE",
});

export class ConferenceInvoice {
  constructor({
    id = randomUUID(),
    tenantId,
    invoiceNumber,
    customerId,
    conferenceId,

    currency = "NGN",

    subtotalMinor = 0,
    taxMinor = 0,
    discountMinor = 0,
    totalMinor,

    amountPaidMinor = 0,

    status = InvoiceStatus.DRAFT,

    issuedAt = new Date(),
    dueAt = null,
    paidAt = null,

    metadata = {},
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    if (!tenantId) {
      throw new Error("tenantId is required.");
    }

    if (!invoiceNumber) {
      throw new Error("invoiceNumber is required.");
    }

    if (!customerId) {
      throw new Error("customerId is required.");
    }

    if (!conferenceId) {
      throw new Error("conferenceId is required.");
    }

    if (!currency) {
      throw new Error("currency is required.");
    }

    if (totalMinor == null) {
      totalMinor =
        subtotalMinor +
        taxMinor -
        discountMinor;
    }

    if (totalMinor < 0) {
      throw new Error("Invoice total cannot be negative.");
    }

    this.id = id;
    this.tenantId = tenantId;

    this.invoiceNumber = invoiceNumber;

    this.customerId = customerId;
    this.conferenceId = conferenceId;

    this.currency = currency;

    this.subtotalMinor = subtotalMinor;
    this.taxMinor = taxMinor;
    this.discountMinor = discountMinor;
    this.totalMinor = totalMinor;

    this.amountPaidMinor = amountPaidMinor;

    this.status = status;

    this.issuedAt = issuedAt;
    this.dueAt = dueAt;
    this.paidAt = paidAt;

    this.metadata = metadata;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  outstandingBalanceMinor() {
    return this.totalMinor - this.amountPaidMinor;
  }

  isPaid() {
    return this.status === InvoiceStatus.PAID;
  }

  isOutstanding() {
    return this.outstandingBalanceMinor() > 0;
  }

  applyPayment(amountMinor) {
    if (amountMinor <= 0) {
      throw new Error("Payment amount must be positive.");
    }

    this.amountPaidMinor += amountMinor;

    if (this.amountPaidMinor >= this.totalMinor) {
      this.amountPaidMinor = this.totalMinor;
      this.status = InvoiceStatus.PAID;
      this.paidAt = new Date();
    } else {
      this.status = InvoiceStatus.PARTIALLY_PAID;
    }

    this.updatedAt = new Date();
  }

  cancel() {
    if (this.isPaid()) {
      throw new Error("Paid invoices cannot be cancelled.");
    }

    this.status = InvoiceStatus.CANCELLED;
    this.updatedAt = new Date();
  }

  markOverdue() {
    if (
      this.status === InvoiceStatus.PENDING &&
      this.dueAt &&
      this.dueAt < new Date()
    ) {
      this.status = InvoiceStatus.OVERDUE;
      this.updatedAt = new Date();
    }
  }

  toJSON() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      invoiceNumber: this.invoiceNumber,
      customerId: this.customerId,
      conferenceId: this.conferenceId,

      currency: this.currency,

      subtotalMinor: this.subtotalMinor,
      taxMinor: this.taxMinor,
      discountMinor: this.discountMinor,
      totalMinor: this.totalMinor,

      amountPaidMinor: this.amountPaidMinor,

      status: this.status,

      issuedAt: this.issuedAt,
      dueAt: this.dueAt,
      paidAt: this.paidAt,

      metadata: this.metadata,

      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}