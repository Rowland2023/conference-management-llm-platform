/**
 * @file application/ProcessRefundUseCase.js
 * @description Command Handler responsible for safe, idempotent execution of pending refunds.
 */

import { RefundDomainError } from "../domain/RefundErrors.js";

class ProcessRefundUseCase {

  /**
   * @param {Object} params
   * @param {Object} params.refundRepository
   * @param {Object} params.paymentGatewayAdapter
   * @param {Object} params.outboxRepository
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
   * @returns {Promise<Object>}
   */
  async execute(refundId, options = {}) {

    const {
      correlationId,
    } = options;


    // -------------------------------------------------------------------------
    // Phase 1: Acquire Row Lock & Validate Transition to PROCESSING
    // -------------------------------------------------------------------------

    const refund =
      await this.dbTransactionManager.runInTransaction(
        async (trx) => {

          // SELECT ... FOR UPDATE
          const record =
            await this.refundRepository.findByIdForUpdate(
              refundId,
              { trx }
            );


          if (!record) {
            throw new RefundDomainError(
              `Refund with ID '${refundId}' was not found.`,
              "REFUND_NOT_FOUND"
            );
          }


          // Idempotent short circuit
          if (record.status === "COMPLETED") {

            this.logger.info(
              `[ProcessRefundUseCase] Refund '${refundId}' already completed. Skipping processing.`
            );

            return record;
          }


          if (record.status === "PROCESSING") {

            this.logger.warn(
              `[ProcessRefundUseCase] Refund '${refundId}' is already currently processing elsewhere.`
            );

            return record;
          }


          // Domain transition
          record.markProcessing();


          await this.refundRepository.updateStatus(
            record,
            { trx }
          );


          return record;
        }
      );


    // Already completed or another worker owns execution
    if (
      refund.status === "COMPLETED" ||
      (
        refund.status === "PROCESSING" &&
        !refund.isDirty()
      )
    ) {
      return refund;
    }



    // -------------------------------------------------------------------------
    // Phase 2: Upstream Gateway Execution
    // -------------------------------------------------------------------------

    try {

      const gatewayIdempotencyKey =
        `refund_exec_${refund.id}_${refund.idempotencyKey}`;


      const gatewayResult =
        await this.paymentGatewayAdapter.executeRefund({

          gatewayIdempotencyKey,

          transactionReference:
            refund.transactionId,

          amount:
            refund.amount.amount,

          currency:
            refund.amount.currency,

          reason:
            refund.reason.toString(),

        });



      // -----------------------------------------------------------------------
      // Phase 3: Complete Refund + Atomic Outbox Commit
      // -----------------------------------------------------------------------

      await this.dbTransactionManager.runInTransaction(
        async (trx) => {

          refund.markCompleted(
            gatewayResult.gatewayReference
          );


          await this.refundRepository.updateStatus(
            refund,
            { trx }
          );


          const events =
            refund.pullDomainEvents();


          for (const event of events) {

            await this.outboxRepository.save(
              event,
              {
                trx,
                correlationId,
              }
            );

          }

        }
      );


      this.logger.info(
        `[ProcessRefundUseCase] Refund '${refundId}' successfully processed and completed.`
      );


      return refund;


    } catch (error) {


      this.logger.error(
        `[ProcessRefundUseCase] Gateway failure for refund '${refundId}'`,
        {
          error: error.message,
          isTransient: error.isTransient || false,
          code: error.code,
        }
      );



      // -----------------------------------------------------------------------
      // Phase 4: Failure / Recovery Handling
      // -----------------------------------------------------------------------


      // Network timeout, 5xx, unknown outcome:
      // Keep PROCESSING for reconciliation worker.
      if (error.isTransient) {

        this.logger.warn(
          `[ProcessRefundUseCase] Preserving PROCESSING state for refund '${refundId}' due to transient timeout.`
        );

        throw error;
      }



      // Deterministic failure
      await this.dbTransactionManager.runInTransaction(
        async (trx) => {

          refund.markFailed(
            error.message,
            error.code
          );


          await this.refundRepository.updateStatus(
            refund,
            { trx }
          );


          const events =
            refund.pullDomainEvents();


          for (const event of events) {

            await this.outboxRepository.save(
              event,
              {
                trx,
                correlationId,
              }
            );

          }

        }
      );


      throw error;
    }

  }

}


export default ProcessRefundUseCase;