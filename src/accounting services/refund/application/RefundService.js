/**
 * @file application/RefundService.js
 * @description Application service managing robust execution pipelines for refunds.
 */

const Refund = require('../domain/Refund');
const { InvalidRefundStateError } = require('../domain/RefundErrors');

class RefundService {
  /**
   * @param {Object} params
   * @param {Object} params.refundRepository
   * @param {Object} params.transactionRepository
   * @param {Object} params.paymentGatewayAdapter
   * @param {Object} params.outboxRepository
   * @param {Object} params.dbTransactionManager
   */
  constructor({
    refundRepository,
    transactionRepository,
    paymentGatewayAdapter,
    outboxRepository,
    dbTransactionManager,
  }) {
    this.refundRepository = refundRepository;
    this.transactionRepository = transactionRepository;
    this.paymentGatewayAdapter = paymentGatewayAdapter;
    this.outboxRepository = outboxRepository;
    this.dbTransactionManager = dbTransactionManager;
  }

  /**
   * Orchestrates the creation and processing of a refund.
   * 
   * @param {Object} params
   * @param {string} params.idempotencyKey
   * @param {string} params.transactionId
   * @param {string} params.accountId
   * @param {number} params.amount
   * @param {string} params.reason
   */
  async requestAndProcessRefund({ idempotencyKey, transactionId, accountId, amount, reason }) {
    // 1. First-pass Idempotency Check
    const existingRefund = await this.refundRepository.findByIdempotencyKey(idempotencyKey);
    if (existingRefund) {
      return existingRefund;
    }

    let refund;

    // 2. Stage 1: Create and Persist Refund record + Outbox event within DB Transaction
    try {
      refund = await this.dbTransactionManager.runInTransaction(async (trx) => {
        // Lock target transaction for write (SELECT FOR UPDATE) to calculate remaining balance accurately
        const originalTx = await this.transactionRepository.findByIdForUpdate(transactionId, { trx });
        if (!originalTx) {
          throw new Error(`[RefundService] Original transaction '${transactionId}' not found.`);
        }

        // Sum existing non-failed refunds
        const totalRefunded = await this.refundRepository.getTotalRefundedAmount(transactionId, { trx });

        // Instantiate domain aggregate and validate invariants
        const newRefund = Refund.create({
          idempotencyKey,
          transactionId,
          accountId,
          amount,
          currency: originalTx.currency,
          originalTransactionAmount: originalTx.amount,
          totalAlreadyRefunded: totalRefunded,
          reason,
        });

        // Transition state to PROCESSING
        newRefund.markProcessing();

        // Persist entity
        await this.refundRepository.save(newRefund, { trx });

        // Persist initial domain events (e.g., RefundRequested) via Outbox pattern
        await this._persistOutboxEvents(newRefund.domainEvents, trx);
        newRefund.clearDomainEvents();

        return newRefund;
      });
    } catch (error) {
      // Recover from race conditions on DB Unique Key Constraint (idempotency_key)
      if (this._isUniqueConstraintError(error)) {
        return await this.refundRepository.findByIdempotencyKey(idempotencyKey);
      }
      throw error;
    }

    // 3. Stage 2: External Gateway Dispatch (Outside DB Transaction to prevent connection pool exhaustion)
    try {
      const gatewayResponse = await this.paymentGatewayAdapter.executeRefund({
        refundId: refund.id,
        transactionReference: refund.transactionId,
        amount: refund.amount.amount,
        minorAmount: refund.amount.minorAmount,
        currency: refund.amount.currency,
        reason: refund.reason,
      });

      // 4a. Success path: Mark Completed & Write Outbox Events
      await this.dbTransactionManager.runInTransaction(async (trx) => {
        refund.markCompleted(gatewayResponse.gatewayReference);
        await this.refundRepository.updateStatus(refund, { trx });
        await this._persistOutboxEvents(refund.domainEvents, trx);
      });

      refund.clearDomainEvents();
      return refund;

    } catch (error) {
      // 4b. Gateway Failure Handling
      const isDeterministicError = this._isDeterministicGatewayError(error);

      if (isDeterministicError) {
        // Gateway explicitly rejected the refund (e.g., 400 Bad Request, Card Expired, Insufficient Merchant Balance)
        await this.dbTransactionManager.runInTransaction(async (trx) => {
          refund.markFailed(error.message);
          await this.refundRepository.updateStatus(refund, { trx });
          await this._persistOutboxEvents(refund.domainEvents, trx);
        });

        refund.clearDomainEvents();
        throw error;
      }

      // Non-Deterministic Error (e.g., Network Timeout, HTTP 502/503/504, Socket Hangup)
      // DO NOT mark as FAILED! Leave in PROCESSING state for reconciliation/webhook handler.
      console.warn(
        `[RefundService] Non-deterministic error occurred for refund [${refund.id}]. ` +
        `Leaving status as PROCESSING for reconciliation background worker. Error: ${error.message}`
      );

      throw error;
    }
  }

  /**
   * Persists domain events to outbox repository
   * @private
   */
  async _persistOutboxEvents(events, trx) {
    for (const event of events) {
      await this.outboxRepository.save(
        {
          id: event.eventId,
          aggregateType: 'Refund',
          aggregateId: event.payload.refundId || event.payload.transactionId,
          type: event.type,
          payload: JSON.stringify(event.payload),
          occurredOn: event.occurredOn,
        },
        { trx }
      );
    }
  }

  /**
   * Identifies PostgreSQL / MySQL unique constraint violation error codes
   * @private
   */
  _isUniqueConstraintError(error) {
    // Postgres code: 23505 | MySQL code: ER_DUP_ENTRY / 1062
    return error.code === '23505' || error.code === 'ER_DUP_ENTRY' || error.number === 2627;
  }

  /**
   * Distinguishes hard gateway rejections from network timeouts
   * @private
   */
  _isDeterministicGatewayError(error) {
    // If adapter attaches status code, HTTP 4xx errors are deterministic
    if (error.status && error.status >= 400 && error.status < 500) {
      return true;
    }
    // Timeout/Connection resets are non-deterministic
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKETTIMEDOUT') {
      return false;
    }
    return false;
  }
}

module.exports = RefundService;