/**
 * @file domain/RefundEvents.js
 * @description Strongly-typed Domain Event envelope and event factories for the Refund Aggregate.
 */

const crypto = require('crypto');

/**
 * Base envelope for all Domain Events across the ledger context.
 */
class BaseRefundEvent {
  /**
   * @param {string} eventType - Qualified event name (e.g., 'refund.requested')
   * @param {Object} payload - Domain-specific primitive payload
   * @param {Object} [metadata] - Correlation, causation, and actor tracing context
   */
  constructor(eventType, payload, metadata = {}) {
    if (!payload || !payload.refundId) {
      throw new Error(`[BaseRefundEvent] 'refundId' is required in payload for event '${eventType}'.`);
    }

    this.eventId = crypto.randomUUID();
    this.eventType = eventType;
    this.aggregateName = 'Refund';
    this.aggregateId = String(payload.refundId);
    this.schemaVersion = 1;
    this.occurredOn = new Date().toISOString();

    // Traceability & Distributed Context
    this.metadata = Object.freeze({
      correlationId: metadata.correlationId || crypto.randomUUID(),
      causationId: metadata.causationId || null,
      actorId: metadata.actorId || null,
      environment: process.env.NODE_ENV || 'development',
    });

    // Deep freeze payload to guarantee complete immutability
    this.payload = Object.freeze({ ...payload });

    Object.freeze(this);
  }

  /**
   * Standard JSON format for Outbox table `payload` column or Kafka message value.
   */
  toJSON() {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      aggregateName: this.aggregateName,
      aggregateId: this.aggregateId,
      schemaVersion: this.schemaVersion,
      occurredOn: this.occurredOn,
      metadata: this.metadata,
      payload: this.payload,
    };
  }

  /**
   * Helper to format directly for Transactional Outbox table insertions.
   * @returns {Object}
   */
  toOutboxRow() {
    return {
      id: this.eventId,
      aggregate_type: this.aggregateName,
      aggregate_id: this.aggregateId,
      event_type: this.eventType,
      payload: JSON.stringify(this.toJSON()),
      created_at: this.occurredOn,
    };
  }
}

class RefundRequestedEvent extends BaseRefundEvent {
  constructor(payload, metadata) {
    super(
      'refund.requested',
      {
        refundId: payload.refundId,
        transactionId: payload.transactionId,
        accountId: payload.accountId,
        amount: Number(payload.amount),
        currency: String(payload.currency).toUpperCase(),
        reasonCategory: payload.reasonCategory,
        notes: payload.notes || null,
      },
      metadata
    );
  }
}

class RefundCompletedEvent extends BaseRefundEvent {
  constructor(payload, metadata) {
    super(
      'refund.completed',
      {
        refundId: payload.refundId,
        transactionId: payload.transactionId,
        accountId: payload.accountId,
        amount: Number(payload.amount),
        currency: String(payload.currency).toUpperCase(),
        gatewayReference: payload.gatewayReference,
        completedAt: payload.completedAt || new Date().toISOString(),
      },
      metadata
    );
  }
}

class RefundFailedEvent extends BaseRefundEvent {
  constructor(payload, metadata) {
    super(
      'refund.failed',
      {
        refundId: payload.refundId,
        transactionId: payload.transactionId,
        accountId: payload.accountId,
        reason: payload.reason,
        gatewayErrorCode: payload.gatewayErrorCode || null,
        failedAt: payload.failedAt || new Date().toISOString(),
      },
      metadata
    );
  }
}

module.exports = {
  BaseRefundEvent,
  RefundRequestedEvent,
  RefundCompletedEvent,
  RefundFailedEvent,
};