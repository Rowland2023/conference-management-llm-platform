
/**
 * @file payment/application/services/PaymentWebhookService.js
 *
 * Payment Webhook Application Service.
 *
 * Coordinates webhook processing for external payment providers.
 *
 * No HTTP logic belongs here.
 * No provider-specific signature verification belongs here.
 * Provider verification is handled by the infrastructure verifiers
 * and webhook use cases.
 */

export class PaymentWebhookService {

    constructor({

        handlePaystackWebhookUseCase,

        handleStripeWebhookUseCase,

    }) {

        this.handlePaystackWebhookUseCase =
            handlePaystackWebhookUseCase;

        this.handleStripeWebhookUseCase =
            handleStripeWebhookUseCase;

    }


    /**
     * Handle Paystack webhook.
     */
    async handlePaystackWebhook(command) {

        return await this.handlePaystackWebhookUseCase.execute(
            command
        );

    }


    /**
     * Handle Stripe webhook.
     */
    async handleStripeWebhook(command) {

        return await this.handleStripeWebhookUseCase.execute(
            command
        );

    }

}