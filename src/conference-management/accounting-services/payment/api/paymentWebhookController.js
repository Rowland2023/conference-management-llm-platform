/**
 * @file modules/payment/api/PaymentWebhookController.js
 */

export class PaymentWebhookController {
  constructor({
    handlePaymentWebhookUseCase,
    logger,
  }) {
    this.handlePaymentWebhookUseCase =
      handlePaymentWebhookUseCase;

    this.logger = logger;

    this.handlePaystackWebhook =
      this.handlePaystackWebhook.bind(this);

    this.handleStripeWebhook =
      this.handleStripeWebhook.bind(this);
  }

  /**
   * POST /webhooks/paystack
   */
  async handlePaystackWebhook(req, res, next) {
    try {
      const result =
        await this.handlePaymentWebhookUseCase.execute({
          provider: "PAYSTACK",

          headers: req.headers,

          rawBody: req.rawBody,

          body: req.body,

          correlationId:
            req.correlationId,
        });

      res.status(200).json({
        success: true,
        provider: "PAYSTACK",
        processed: result,
      });
    } catch (error) {
      this.logger?.error({
        message: "Paystack webhook failed",
        error,
        correlationId: req.correlationId,
      });

      next(error);
    }
  }

  /**
   * POST /webhooks/stripe
   */
  async handleStripeWebhook(req, res, next) {
    try {
      const result =
        await this.handlePaymentWebhookUseCase.execute({
          provider: "STRIPE",

          headers: req.headers,

          rawBody: req.rawBody,

          body: req.body,

          correlationId:
            req.correlationId,
        });

      res.status(200).json({
        success: true,
        provider: "STRIPE",
        processed: result,
      });
    } catch (error) {
      this.logger?.error({
        message: "Stripe webhook failed",
        error,
        correlationId: req.correlationId,
      });

      next(error);
    }
  }
}