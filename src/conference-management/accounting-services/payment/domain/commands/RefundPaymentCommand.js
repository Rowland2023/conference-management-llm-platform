// src/conference-management/accounting-services/payment/domain/commands/RefundPaymentCommand.js

export class RefundPaymentCommand {
  /**
   * @param {Object} params
   * @param {string} params.paymentId
   * @param {number} params.amountMinor
   * @param {string} params.reason
   * @param {string} params.tenantId
   * @param {string} [params.correlationId]
   * @param {Object} [params.actor]
   */
  constructor({
    paymentId,
    amountMinor,
    reason,
    tenantId,
    correlationId = null,
    actor = null,
  }) {
    if (!paymentId) {
      throw new Error("RefundPaymentCommand: paymentId is required.");
    }

    if (!tenantId) {
      throw new Error("RefundPaymentCommand: tenantId is required.");
    }

    if (
      !Number.isInteger(amountMinor) ||
      amountMinor <= 0
    ) {
      throw new Error(
        "RefundPaymentCommand: amountMinor must be a positive integer."
      );
    }

    if (!reason || reason.trim().length === 0) {
      throw new Error("RefundPaymentCommand: reason is required.");
    }

    this.paymentId = paymentId;
    this.amountMinor = amountMinor;
    this.reason = reason.trim();
    this.tenantId = tenantId;
    this.correlationId = correlationId;
    this.actor = actor;

    // Make the command immutable
    Object.freeze(this);
  }
}