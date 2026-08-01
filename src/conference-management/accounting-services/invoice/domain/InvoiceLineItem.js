// src/conference-management/accounting-services/invoice/domain/InvoiceLineItem.js

import { randomUUID } from "node:crypto";

export class InvoiceLineItem {
  constructor({
    id = randomUUID(),

    description,
    quantity = 1,
    unitPriceMinor,

    taxMinor = 0,
    discountMinor = 0,

    metadata = {},
  }) {
    if (!description || typeof description !== "string") {
      throw new Error("Invoice line item description is required.");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error("Quantity must be a positive integer.");
    }

    if (!Number.isInteger(unitPriceMinor) || unitPriceMinor < 0) {
      throw new Error("Unit price must be a non-negative integer.");
    }

    if (!Number.isInteger(taxMinor) || taxMinor < 0) {
      throw new Error("Tax amount must be a non-negative integer.");
    }

    if (!Number.isInteger(discountMinor) || discountMinor < 0) {
      throw new Error("Discount amount must be a non-negative integer.");
    }

    this.id = id;
    this.description = description;
    this.quantity = quantity;
    this.unitPriceMinor = unitPriceMinor;
    this.taxMinor = taxMinor;
    this.discountMinor = discountMinor;
    this.metadata = metadata;

    Object.freeze(this);
  }

  get subtotalMinor() {
    return this.quantity * this.unitPriceMinor;
  }

  get totalMinor() {
    return (
      this.subtotalMinor +
      this.taxMinor -
      this.discountMinor
    );
  }

  toJSON() {
    return {
      id: this.id,
      description: this.description,
      quantity: this.quantity,
      unitPriceMinor: this.unitPriceMinor,
      subtotalMinor: this.subtotalMinor,
      taxMinor: this.taxMinor,
      discountMinor: this.discountMinor,
      totalMinor: this.totalMinor,
      metadata: this.metadata,
    };
  }
}