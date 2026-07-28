/**
 * @file presentation/http/RefundController.js
 * @description HTTP Controller handling API routes for the Refund context.
 */

import {
  RefundDomainError,
} from "../../domain/RefundErrors.js";


class RefundController {

  /**
   * @param {Object} params
   * @param {Object} params.refundService
   */
  constructor({
    refundService,
  }) {

    this.refundService = refundService;

    // Preserve Express handler context
    this.createRefund =
      this.createRefund.bind(this);

  }



  /**
   * Handles POST /api/v1/refunds
   */
  async createRefund(
    req,
    res,
    next
  ) {

    try {


      // -----------------------------------------------------------------------
      // 1. Validate Idempotency Header
      // -----------------------------------------------------------------------

      const idempotencyKey =
        req.headers["x-idempotency-key"];


      if (
        !idempotencyKey ||
        typeof idempotencyKey !== "string" ||
        !idempotencyKey.trim()
      ) {

        return res.status(400).json({

          error: {

            code:
              "MISSING_IDEMPOTENCY_KEY",

            message:
              "Header X-Idempotency-Key is required and must be a valid non-empty string.",

          },

        });

      }




      // -----------------------------------------------------------------------
      // 2. Validate Request Payload
      // -----------------------------------------------------------------------

      const {
        transactionId,
        amount,
        reason,
      } = req.body;



      const validationError =
        this._validateInput({
          transactionId,
          amount,
          reason,
        });



      if (validationError) {

        return res.status(400).json({

          error: {

            code:
              "INVALID_INPUT_PAYLOAD",

            message:
              validationError,

          },

        });

      }




      // -----------------------------------------------------------------------
      // 3. Extract Authenticated Actor Context
      // -----------------------------------------------------------------------

      const accountId =
        req.auth?.actor?.id;



      if (!accountId) {

        return res.status(401).json({

          error: {

            code:
              "UNAUTHORIZED",

            message:
              "Authenticated actor context is required to initiate a refund.",

          },

        });

      }




      // -----------------------------------------------------------------------
      // 4. Delegate to Application Service
      // -----------------------------------------------------------------------

      const refund =
        await this.refundService.requestAndProcessRefund({

          idempotencyKey:
            idempotencyKey.trim(),

          transactionId,

          accountId,

          amount:
            Number(amount),

          reason:
            reason
              ? String(reason).trim()
              : "Customer requested refund",

        });





      // -----------------------------------------------------------------------
      // 5. Build Response DTO
      // -----------------------------------------------------------------------

      const status =
        this._unwrapStatus(
          refund.status
        );


      const isReplay =
        refund.idempotencyKey === idempotencyKey &&
        refund.createdAt <
          new Date(Date.now() - 1000);



      return res
        .status(
          isReplay ? 200 : 201
        )
        .json({

          status:
            "success",

          data: {

            refundId:
              refund.id,

            transactionId:
              refund.transactionId,

            amount:
              refund.amount.amount,

            currency:
              refund.amount.currency,

            status,

            gatewayReference:
              refund.gatewayReference || null,

            createdAt:
              refund.createdAt,

          },

        });



    } catch (error) {


      // -----------------------------------------------------------------------
      // 6. Known Domain Exceptions
      // -----------------------------------------------------------------------

      if (
        error instanceof RefundDomainError
      ) {

        return res.status(422).json({

          error: {

            code:
              error.code,

            message:
              error.message,

            details:
              error.details || {},

          },

        });

      }



      // -----------------------------------------------------------------------
      // 7. Delegate Unknown Errors
      // -----------------------------------------------------------------------

      next(error);

    }

  }




  /**
   * Lightweight payload validation guard.
   *
   * @private
   */
  _validateInput({
    transactionId,
    amount,
    reason,
  }) {


    if (
      !transactionId ||
      typeof transactionId !== "string"
    ) {

      return 'Field "transactionId" must be a valid string.';

    }



    const parsedAmount =
      Number(amount);



    if (
      Number.isNaN(parsedAmount) ||
      parsedAmount <= 0
    ) {

      return 'Field "amount" must be a positive numeric value greater than 0.';

    }



    if (
      reason &&
      typeof reason !== "string"
    ) {

      return 'Field "reason" must be a string.';

    }



    return null;

  }




  /**
   * Converts Value Object or string to primitive status.
   *
   * @private
   */
  _unwrapStatus(status) {

    if (
      typeof status === "string"
    ) {

      return status;

    }


    return status?.value ||
      String(status);

  }

}


export default RefundController;