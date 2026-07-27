/**
 * @file domain/Refund.js
 * @description Core Aggregate Root for managing the Refund lifecycle, invariants, and domain events.
 */

const crypto = require('crypto');
const RefundStatus = require('./RefundStatus');
const RefundAmount = require('./RefundAmount');
const { InvalidRefundStateError, ExceededRefundLimitError } = require('./RefundErrors');

class Refund {
  constructor({
    id = crypto.randomUUID(),
    idempotencyKey,
    transactionId,
    accountId,
    amount,
    currency = 'NGN',
    reason,
    status = RefundStatus.REQUESTED,
    gatewayReference = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    if (!idempotencyKey || !transactionId || !accountId) {
      throw new Error('[Refund] Missing mandatory identities (idempotencyKey, transactionId, accountId).');
    }

    this.id = id;
    this.idempotencyKey = idempotencyKey;
    this.transactionId = transactionId;
    this.accountId = accountId;

    // Robust Re-hydration: Handles RefundAmount instances, DB objects ({amount, currency}), or raw numbers
    if (amount instanceof RefundAmount) {
      this.amount = amount;
    } else if (typeof amount === 'object' && amount !== null && 'amount' in amount) {
      this.amount = new RefundAmount(amount.amount, amount.currency || currency);
    } else if (typeof amount === 'number') {
      this.amount = new RefundAmount(amount, currency);
    } else {
      throw new Error('[Refund] Invalid amount parameter supplied to Refund entity.');
    }

    // Ensure status is wrapped as a RefundStatus Value Object if passed as a raw string
    this.status = status instanceof RefundStatus ? status : new RefundStatus(status);
    this.reason = reason;
    this.gatewayReference = gatewayReference;
    this.createdAt = createdAt instanceof Date ? createdAt : new Date(createdAt);
    this.updatedAt = updatedAt instanceof Date ? updatedAt : new Date(updatedAt);

    this.domainEvents = [];
  }

  /**
   * Factory constructor for initiating a new refund request with invariant validations.
   */
  static create({
    idempotencyKey,
    transactionId,
    accountId,
    amount,
    currency = 'NGN',
    originalTransactionAmount,
    totalAlreadyRefunded = 0,
    reason,
  }) {
    const refundAmt = new RefundAmount(amount, currency);
    const originalAmt = new RefundAmount(originalTransactionAmount, currency);
    const priorRefundsAmt = new RefundAmount(totalAlreadyRefunded, currency);

    // Minor Unit Calculation: Eliminates floating-point inaccuracies completely
    const availableMinorUnit = originalAmt.minorAmount - priorRefundsAmt.minorAmount;

    if (availableMinorUnit < 0) {
      throw new ExceededRefundLimitError(refundAmt.amount, 0);
    }

    if (refundAmt.minorAmount > availableMinorUnit) {
      const availableMajorUnit = availableMinorUnit / 100;
      throw new ExceededRefundLimitError(refundAmt.amount, availableMajorUnit);
    }

    const refund = new Refund({
      idempotencyKey,
      transactionId,
      accountId,
      amount: refundAmt,
      reason,
      status: new RefundStatus(RefundStatus.REQUESTED),
    });

    refund._addDomainEvent('RefundRequested', {
      refundId: refund.id,
      transactionId: refund.transactionId,
      accountId: refund.accountId,
      amount: refund.amount.amount,
      minorAmount: refund.amount.minorAmount,
      currency: refund.amount.currency,
    });

    return refund;
  }

  markProcessing() {
    this._transitionTo(RefundStatus.PROCESSING);
  }

  markCompleted(gatewayReference) {
    if (!gatewayReference) {
      throw new Error('[Refund] Gateway reference is mandatory when completing a refund.');
    }

    this._transitionTo(RefundStatus.COMPLETED);
    this.gatewayReference = gatewayReference;

    this._addDomainEvent('RefundCompleted', {
      refundId: this.id,
      transactionId: this.transactionId,
      accountId: this.accountId,
      amount: this.amount.amount,
      minorAmount: this.amount.minorAmount,
      currency: this.amount.currency,
      gatewayReference,
    });
  }

  markFailed(failureReason) {
    this._transitionTo(RefundStatus.FAILED);

    this._addDomainEvent('RefundFailed', {
      refundId: this.id,
      transactionId: this.transactionId,
      reason: failureReason,
    });
  }

  markRejected(rejectionReason) {
    this._transitionTo(RefundStatus.REJECTED);

    this._addDomainEvent('RefundRejected', {
      refundId: this.id,
      transactionId: this.transactionId,
      reason: rejectionReason,
    });
  }

  /**
   * Internal status transition execution using RefundStatus state machine rules.
   * @private
   */
  _transitionTo(targetStatus) {
    if (!this.status.canTransitionTo(targetStatus)) {
      throw new InvalidRefundStateError(
        `Cannot transition refund [${this.id}] from state "${this.status.value}" to "${targetStatus}".`
      );
    }
    this.status = new RefundStatus(targetStatus);
    this.updatedAt = new Date();
  }

  _addDomainEvent(type, payload) {
    this.domainEvents.push({
      eventId: crypto.randomUUID(),
      type,
      payload,
      occurredOn: new Date(),
    });
  }

  clearDomainEvents() {
    this.domainEvents = [];
  }
}

module.exports = Refund;