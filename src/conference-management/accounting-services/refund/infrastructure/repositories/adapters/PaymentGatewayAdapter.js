/**
 * @file infrastructure/adapters/PaymentGatewayAdapter.js
 * @description Anti-Corruption Layer (ACL) adapter for payment processor integrations.
 */

export class GatewayError extends Error {
  constructor(
    message,
    {
      code = "GATEWAY_ERROR",
      isTransient = false,
      raw = null,
    } = {}
  ) {
    super(message);

    this.name = this.constructor.name;
    this.code = code;
    this.isTransient = isTransient;
    this.raw = raw;
  }
}


export class GatewayTransientError extends GatewayError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      isTransient: true,
    });
  }
}


export class GatewayDeclineError extends GatewayError {
  constructor(message, options = {}) {
    super(message, {
      ...options,
      isTransient: false,
    });
  }
}


/**
 * Abstract Port Interface
 */
export class PaymentGatewayAdapter {

  /**
   * Executes refund request at payment provider level.
   *
   * @param {Object} params
   * @returns {Promise<{
   *  gatewayReference:string,
   *  status:string,
   *  rawResponse:Object
   * }>}
   */
  async executeRefund({
    gatewayIdempotencyKey,
    transactionReference,
    amount,
    currency,
    reason,
  }) {
    throw new Error(
      "[PaymentGatewayAdapter] Method executeRefund() must be implemented by provider."
    );
  }
}


/**
 * Paystack Provider Adapter Implementation
 */
export class PaystackGatewayAdapter extends PaymentGatewayAdapter {

  constructor({
    httpClient,
    secretKey,
  }) {
    super();

    if (!httpClient) {
      throw new Error(
        "[PaystackGatewayAdapter] httpClient is required."
      );
    }

    if (!secretKey) {
      throw new Error(
        "[PaystackGatewayAdapter] secretKey is required."
      );
    }

    this.httpClient = httpClient;
    this.secretKey = secretKey;
  }


  async executeRefund({
    gatewayIdempotencyKey,
    transactionReference,
    amount,
    currency,
    reason,
  }) {

    const amountInKobo =
      Math.round(
        Number(
          Number(amount).toFixed(2)
        ) * 100
      );


    const payload = {
      transaction: transactionReference,
      amount: amountInKobo,
      merchant_note:
        reason || "Customer Refund",
    };


    const headers = {
      Authorization:
        `Bearer ${this.secretKey}`,

      "Content-Type":
        "application/json",
    };


    if (gatewayIdempotencyKey) {
      headers["X-Idempotency-Key"] =
        gatewayIdempotencyKey;
    }


    try {

      const response =
        await this.httpClient.post(
          "https://api.paystack.co/refund",
          payload,
          {
            headers,
            timeout: 10000,
          }
        );


      const responseBody =
        response.data;


      if (
        !responseBody ||
        responseBody.status !== true
      ) {
        throw new GatewayDeclineError(
          responseBody?.message ||
            "Paystack rejected the refund request.",
          {
            code: "PAYSTACK_DECLINED",
            raw: responseBody,
          }
        );
      }


      return {

        gatewayReference:
          String(
            responseBody.data.id ||
            responseBody.data.reference
          ),

        status:
          String(
            responseBody.data.status
          ).toUpperCase(),

        rawResponse:
          responseBody,
      };


    } catch (error) {


      if (error instanceof GatewayError) {
        throw error;
      }


      if (
        error.code === "ECONNABORTED" ||
        error.code === "ETIMEDOUT" ||
        !error.response
      ) {

        throw new GatewayTransientError(
          `Paystack network timeout/drop for transaction '${transactionReference}': ${error.message}`,
          {
            code: "NETWORK_TIMEOUT",
            raw: error,
          }
        );
      }


      const statusCode =
        error.response?.status;

      const errorData =
        error.response?.data;


      if (statusCode >= 500) {

        throw new GatewayTransientError(
          `Paystack server error (${statusCode}) during refund execution: ${
            errorData?.message ||
            error.message
          }`,
          {
            code: "PAYSTACK_SERVER_ERROR",
            raw: errorData,
          }
        );
      }


      throw new GatewayDeclineError(
        errorData?.message ||
          `Paystack request failed with status ${statusCode}`,
        {
          code: `PAYSTACK_HTTP_${statusCode}`,
          raw: errorData,
        }
      );
    }
  }
}