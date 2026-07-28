/**
 * @file application/RefundService.js
 * @description Application service managing robust execution pipelines for refunds.
 */

import Refund from "../domain/Refund.js";
import {
  InvalidRefundStateError,
} from "../domain/RefundErrors.js";


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
   * Orchestrates creation and processing of a refund.
   *
   * @param {Object} params
   * @param {string} params.idempotencyKey
   * @param {string} params.transactionId
   * @param {string} params.accountId
   * @param {number} params.amount
   * @param {string} params.reason
   */
  async requestAndProcessRefund({
    idempotencyKey,
    transactionId,
    accountId,
    amount,
    reason,
  }) {


    // -------------------------------------------------------------------------
    // Stage 0: Idempotency Check
    // -------------------------------------------------------------------------

    const existingRefund =
      await this.refundRepository.findByIdempotencyKey(
        idempotencyKey
      );


    if (existingRefund) {
      return existingRefund;
    }



    let refund;



    // -------------------------------------------------------------------------
    // Stage 1: Create Refund + Persist + Outbox Atomically
    // -------------------------------------------------------------------------

    try {

      refund =
        await this.dbTransactionManager.runInTransaction(
          async (trx) => {


            const originalTx =
              await this.transactionRepository.findByIdForUpdate(
                transactionId,
                { trx }
              );


            if (!originalTx) {

              throw new Error(
                `[RefundService] Original transaction '${transactionId}' not found.`
              );

            }



            const totalRefunded =
              await this.refundRepository.getTotalRefundedAmount(
                transactionId,
                { trx }
              );



            const newRefund =
              Refund.create({

                idempotencyKey,

                transactionId,

                accountId,

                amount,

                currency:
                  originalTx.currency,

                originalTransactionAmount:
                  originalTx.amount,

                totalAlreadyRefunded:
                  totalRefunded,

                reason,

              });



            // Move lifecycle into processing state
            newRefund.markProcessing();



            await this.refundRepository.save(
              newRefund,
              { trx }
            );



            await this._persistOutboxEvents(
              newRefund.domainEvents,
              trx
            );



            newRefund.clearDomainEvents();



            return newRefund;

          }
        );


    } catch (error) {


      // Handle concurrent idempotency race
      if (this._isUniqueConstraintError(error)) {

        return await this.refundRepository.findByIdempotencyKey(
          idempotencyKey
        );

      }


      throw error;

    }




    // -------------------------------------------------------------------------
    // Stage 2: Execute External Gateway Call
    // -------------------------------------------------------------------------

    try {


      const gatewayResponse =
        await this.paymentGatewayAdapter.executeRefund({

          refundId:
            refund.id,

          transactionReference:
            refund.transactionId,

          amount:
            refund.amount.amount,

          minorAmount:
            refund.amount.minorAmount,

          currency:
            refund.amount.currency,

          reason:
            refund.reason,

        });



      // -----------------------------------------------------------------------
      // Stage 3: Complete Refund + Outbox
      // -----------------------------------------------------------------------

      await this.dbTransactionManager.runInTransaction(
        async (trx) => {


          refund.markCompleted(
            gatewayResponse.gatewayReference
          );


          await this.refundRepository.updateStatus(
            refund,
            { trx }
          );


          await this._persistOutboxEvents(
            refund.domainEvents,
            trx
          );


        }
      );


      refund.clearDomainEvents();


      return refund;



    } catch (error) {


      // -----------------------------------------------------------------------
      // Stage 4: Gateway Failure Handling
      // -----------------------------------------------------------------------

      const isDeterministicError =
        this._isDeterministicGatewayError(error);



      if (isDeterministicError) {


        await this.dbTransactionManager.runInTransaction(
          async (trx) => {


            refund.markFailed(
              error.message
            );


            await this.refundRepository.updateStatus(
              refund,
              { trx }
            );


            await this._persistOutboxEvents(
              refund.domainEvents,
              trx
            );


          }
        );



        refund.clearDomainEvents();


        throw error;

      }




      console.warn(
        `[RefundService] Non-deterministic error occurred for refund [${refund.id}]. ` +
        `Leaving status as PROCESSING for reconciliation background worker. Error: ${error.message}`
      );


      throw error;

    }

  }




  /**
   * Persists domain events to outbox repository.
   *
   * @private
   */
  async _persistOutboxEvents(events, trx) {


    for (const event of events) {


      await this.outboxRepository.save(

        {

          id:
            event.eventId,

          aggregateType:
            "Refund",

          aggregateId:
            event.payload.refundId ||
            event.payload.transactionId,

          type:
            event.type,

          payload:
            JSON.stringify(event.payload),

          occurredOn:
            event.occurredOn,

        },

        { trx }

      );

    }

  }




  /**
   * Identifies database unique constraint violations.
   *
   * @private
   */
  _isUniqueConstraintError(error) {

    return (
      error.code === "23505" ||
      error.code === "ER_DUP_ENTRY" ||
      error.number === 2627
    );

  }




  /**
   * Determines hard gateway rejection.
   *
   * @private
   */
  _isDeterministicGatewayError(error) {


    if (
      error.status &&
      error.status >= 400 &&
      error.status < 500
    ) {
      return true;
    }


    if (
      error.code === "ECONNRESET" ||
      error.code === "ETIMEDOUT" ||
      error.code === "ESOCKETTIMEDOUT"
    ) {
      return false;
    }


    return false;

  }

}


export default RefundService;