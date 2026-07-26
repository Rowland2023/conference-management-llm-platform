/**
 * @file infrastructure/adapters/PaymentGatewayAdapter.js
 * @description Anti-Corruption Layer (ACL) adapter for payment processor integrations.
 */

class GatewayError extends Error {
  constructor(message, { code = 'GATEWAY_ERROR', isTransient = false, raw = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isTransient = isTransient;
    this.raw = raw;
  }
}

class GatewayTransientError extends GatewayError {
  constructor(message, options = {}) {
    super(message, { ...options, isTransient: true });
  }
}

class GatewayDeclineError extends GatewayError {
  constructor(message, options = {}) {
    super(message, { ...options, isTransient: false });
  }
}

/**
 * Abstract Port Interface
 */
class PaymentGatewayAdapter {
  /**
   * Executes refund request at the payment provider level.
   *
   * @param {Object} params
   * @param {string} params.gatewayIdempotencyKey - Deterministic idempotency key for processor
   * @param {string} params.transactionReference - Original payment gateway charge/transaction ID
   * @param {number} params.amount - Major currency unit value (e.g. 150.50 NGN)
   * @param {string} params.currency - ISO currency code
   * @param {string} params.reason - Description/notes
   * @returns {Promise<{ gatewayReference: string, status: string, rawResponse: Object }>}
   */
  async executeRefund({ gatewayIdempotencyKey, transactionReference, amount, currency, reason }) {
    throw new Error('[PaymentGatewayAdapter] Method executeRefund() must be implemented by provider.');
  }
}

/**
 * Paystack Provider Adapter Implementation
 */
class PaystackGatewayAdapter extends PaymentGatewayAdapter {
  /**
   * @param {Object} params
   * @param {Object} params.httpClient - Axios or HTTP client instance configured with timeout limits
   * @param {string} params.secretKey - Paystack API Secret Key
   */
  constructor({ httpClient, secretKey }) {
    super();
    if (!httpClient) throw new Error('[PaystackGatewayAdapter] httpClient is required.');
    if (!secretKey) throw new Error('[PaystackGatewayAdapter] secretKey is required.');

    this.httpClient = httpClient;
    this.secretKey = secretKey;
  }

  /**
   * @override
   */
  async executeRefund({ gatewayIdempotencyKey, transactionReference, amount, currency, reason }) {
    // Safely convert major units to minor units (Kobo) avoiding IEEE 754 float drift
    const amountInKobo = Math.round(Number(Number(amount).toFixed(2)) * 100);

    const payload = {
      transaction: transactionReference,
      amount: amountInKobo,
      merchant_note: reason || 'Customer Refund',
    };

    const headers = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    };

    // Propagate upstream idempotency if supported via header
    if (gatewayIdempotencyKey) {
      headers['X-Idempotency-Key'] = gatewayIdempotencyKey;
    }

    try {
      const response = await this.httpClient.post('https://api.paystack.co/refund', payload, {
        headers,
        timeout: 10000, // 10-second timeout guard
      });

      const responseBody = response.data;

      if (!responseBody || responseBody.status !== true) {
        throw new GatewayDeclineError(
          responseBody?.message || 'Paystack rejected the refund request.',
          { code: 'PAYSTACK_DECLINED', raw: responseBody }
        );
      }

      return {
        gatewayReference: String(responseBody.data.id || responseBody.data.reference),
        status: String(responseBody.data.status).toUpperCase(),
        rawResponse: responseBody,
      };

    } catch (error) {
      // Re-throw already classified GatewayErrors
      if (error instanceof GatewayError) {
        throw error;
      }

      // Classify HTTP Client / Network level exceptions
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT' || !error.response) {
        throw new GatewayTransientError(
          `Paystack network timeout/drop for transaction '${transactionReference}': ${error.message}`,
          { code: 'NETWORK_TIMEOUT', raw: error }
        );
      }

      const statusCode = error.response?.status;
      const errorData = error.response?.data;

      // 5xx errors on processor side are transient (outcome unknown / retryable)
      if (statusCode >= 500) {
        throw new GatewayTransientError(
          `Paystack server error (${statusCode}) during refund execution: ${errorData?.message || error.message}`,
          { code: 'PAYSTACK_SERVER_ERROR', raw: errorData }
        );
      }

      // 4xx errors are deterministic client/decline failures
      throw new GatewayDeclineError(
        errorData?.message || `Paystack request failed with status ${statusCode}`,
        { code: `PAYSTACK_HTTP_${statusCode}`, raw: errorData }
      );
    }
  }
}

module.exports = {
  GatewayError,
  GatewayTransientError,
  GatewayDeclineError,
  PaymentGatewayAdapter,
  PaystackGatewayAdapter,
};