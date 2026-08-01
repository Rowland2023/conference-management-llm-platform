// src/conference-management/accounting-services/payment/domain/queries/GetPaymentByIdQuery.js

import { ValidationError } from "../errors/PaymentErrors.js";

export class GetPaymentByIdQuery {
  constructor({
    paymentId,
    tenantId = null,
    currentUser = null,
  } = {}) {
    if (!paymentId || typeof paymentId !== "string") {
      throw new ValidationError("Payment ID is required.");
    }

    this.paymentId = paymentId.trim();
    this.tenantId = tenantId;
    this.currentUser = currentUser;

    Object.freeze(this);
  }
}