/**
 * @file application/ProcessRefundUseCase.js
 * @description Command Handler responsible for safe, idempotent execution of pending refunds.
 */

const { RefundDomainError } = require('../domain/RefundErrors');

class ProcessRefundUseCase {
  /**
   * @param {Object} params
   * @param {import('../infrastructure/repositories/RefundRepository')} params.refundRepository
   * @param {import('../infrastructure/adapters/PaymentGatewayAdapter')} params.paymentGatewayAdapter
   * @param {import('../infrastructure/messaging/OutboxRepository')} params.outboxRepository
   * @param {Object} params.dbTransactionManager
   * @param {Object} [params.logger]
   */
  constructor({
    refundRepository,
    paymentGatewayAdapter,
    outboxRepository,
    dbTransactionManager,
    logger = console,
  }) {
    this.refundRepository = refundRepository;
    this.paymentGatewayAdapter = paymentGatewayAdapter;
    this.outboxRepository = outboxRepository;
    this.dbTransactionManager = dbTransactionManager;
    this.logger = logger;
  }

  /**
   * Safely executes a refund against the payment processor using double-check locking
   * and strict idempotency controls.
   *
   * @param {string} refundId
   * @param {Object} [options]
   * @param {string} [options.correlationId]
   * @returns {Promise<import('../domain/Refund')>}
   */
  async execute(refundId, options = {}) {
    const { correlationId } = options;

    // -------------------------------------------------------------------------
    // Phase 1: Acquire Row Lock & Validate Transition to PROCESSING
    // -------------------------------------------------------------------------
    const refund = await this.dbTransactionManager.runInTransaction(async (trx) => {
      // Fetch with row-level lock (SELECT ... FOR UPDATE) to eliminate concurrent execution
      const record = await this.refundRepository.findByIdForUpdate(refundId, { trx });
      
      if (!record) {
        throw new RefundDomainError(`Refund with ID '${refundId}' was not found.`, 'REFUND_NOT_FOUND');
      }

      // Short-circuit idempotent re-execution
      if (record.status === 'COMPLETED') {
        this.logger.info(`[ProcessRefundUseCase] Refund '${refundId}' already completed. Skipping processing.`);
        return record;
      }

      if (record.status === 'PROCESSING') {
        this.logger.warn(`[ProcessRefundUseCase] Refund '${refundId}' is already currently processing elsewhere.`);
        return record;
      }

      // Domain state transition
      record.markProcessing();
      
      await this.refundRepository.updateStatus(record, { trx });
      return record;
    });

    // Return early if state is already terminal/processing
    if (refund.status === 'COMPLETED' || (refund.status === 'PROCESSING' && !refund.isDirty())) {
      return refund;
    }

    // -------------------------------------------------------------------------
    // Phase 2: Upstream Gateway Execution (Deterministic Idempotency)
    // -------------------------------------------------------------------------
    try {
      // Upstream key combines original idempotency key with target aggregate identity
      const gatewayIdempotencyKey = `refund_exec_${refund.id}_${refund.idempotencyKey}`;

      const gatewayResult = await this.paymentGatewayAdapter.executeRefund({
        gatewayIdempotencyKey,
        transactionReference: refund.transactionId,
        amount: refund.amount.amount,
        currency: refund.amount.currency,
        reason: refund.reason.toString(),
      });

      // -----------------------------------------------------------------------
      // Phase 3: Transition to COMPLETED + Persist Domain Events (Atomic Outbox)
      // -----------------------------------------------------------------------
      await this.dbTransactionManager.runInTransaction(async (trx) => {
        refund.markCompleted(gatewayResult.gatewayReference);
        await this.refundRepository.updateStatus(refund, { trx });

        // Save domain events generated during markCompleted
        const events = refund.pullDomainEvents();
        for (const event of events) {
          await this.outboxRepository.save(event, { trx, correlationId });
        }
      });

      this.logger.info(`[ProcessRefundUseCase] Refund '${refundId}' successfully processed and completed.`);
      return refund;

    } catch (error) {
      this.logger.error(`[ProcessRefundUseCase] Gateway failure for refund '${refundId}'`, {
        error: error.message,
        isTransient: error.isTransient || false,
        code: error.code,
      });

      // -----------------------------------------------------------------------
      // Phase 4: Handle Failure / Recovery Safety
      // -----------------------------------------------------------------------
      
      // If error is transient (e.g. network timeout/504), DO NOT mark as FAILED.
      // Leave in PROCESSING for reconciliation or worker polling retry.
      if (error.isTransient) {
        this.logger.warn(`[ProcessRefundUseCase] Preserving PROCESSING state for refund '${refundId}' due to transient timeout.`);
        throw error;
      }

      // Hard decline / non-transient rejection -> Safely mark FAILED
      await this.dbTransactionManager.runInTransaction(async (trx) => {
        refund.markFailed(error.message, error.code);
        await this.refundRepository.updateStatus(refund, { trx });

        const events = refund.pullDomainEvents();
        for (const event of events) {
          await this.outboxRepository.save(event, { trx, correlationId });
        }
      });

      throw error;
    }
  }
}

module.exports = ProcessRefundUseCase;