import { NotFoundError, ValidationError } from "../../domain/errors/PaymentErrors.js";

export class HandleStripeWebhookUseCase {
    constructor({
        paymentRepository,
        outboxRepository,
        unitOfWork,
        stripeWebhookVerifier,
        logger = console,
        clock = { now: () => new Date() },
    }) {
        if (!paymentRepository) {
            throw new Error("HandleStripeWebhookUseCase requires paymentRepository.");
        }

        if (!outboxRepository) {
            throw new Error("HandleStripeWebhookUseCase requires outboxRepository.");
        }

        if (!unitOfWork) {
            throw new Error("HandleStripeWebhookUseCase requires unitOfWork.");
        }

        if (!stripeWebhookVerifier) {
            throw new Error("HandleStripeWebhookUseCase requires stripeWebhookVerifier.");
        }

        this.paymentRepository = paymentRepository;
        this.outboxRepository = outboxRepository;
        this.unitOfWork = unitOfWork;
        this.stripeWebhookVerifier = stripeWebhookVerifier;
        this.logger = logger;
        this.clock = clock;
    }

    async execute({ rawBody, signatureHeader, context = {} }) {
        if (!rawBody) {
            throw new ValidationError("Raw Stripe webhook body is required.");
        }

        const event = this.stripeWebhookVerifier.verify(
            rawBody,
            signatureHeader
        );

        this.logger.info?.({
            eventId: event.eventId,
            eventType: event.eventType,
            transactionId: event.transactionId,
        }, "Stripe webhook verified.");

        /*
         * payment_intent.succeeded is the authoritative success event
         * for the Payment aggregate.
         */
        if (event.eventType !== "payment_intent.succeeded") {
            this.logger.info?.({
                eventId: event.eventId,
                eventType: event.eventType,
            }, "Stripe webhook acknowledged without payment mutation.");

            return {
                success: true,
                processed: false,
                eventId: event.eventId,
                eventType: event.eventType,
            };
        }

        if (!event.transactionId) {
            throw new ValidationError(
                "Stripe webhook does not contain a transaction ID."
            );
        }

        return this.unitOfWork.execute(async (trx) => {
            let payment = null;

            /*
             * Stripe PaymentIntent metadata contains our payment identity.
             */
            if (event.bookingId) {
                payment = await this.paymentRepository.findById(
                    event.bookingId,
                    { transaction: trx }
                );
            }

            /*
             * Primary fallback: gateway transaction ID.
             */
            if (!payment) {
                payment = await this.paymentRepository.findByGatewayTransactionId(
                    event.transactionId,
                    { transaction: trx }
                );
            }

            /*
             * Stripe's PaymentIntent ID is also useful when the gateway
             * transaction ID has not yet been persisted locally.
             */
            if (!payment && event.paymentIntentId) {
                payment = await this.paymentRepository.findByGatewayTransactionId(
                    event.paymentIntentId,
                    { transaction: trx }
                );
            }

            if (!payment) {
                throw new NotFoundError(
                    `Payment not found for Stripe transaction '${event.transactionId}'.`
                );
            }

            /*
             * Stripe webhook delivery is at-least-once.
             * Never apply the successful transition twice.
             */
            if (payment.isSuccessful()) {
                this.logger.info?.({
                    paymentId: payment.id,
                    eventId: event.eventId,
                }, "Stripe webhook already processed.");

                return {
                    success: true,
                    processed: false,
                    duplicate: true,
                    payment: payment.toResponse(),
                    eventId: event.eventId,
                };
            }

            /*
             * Validate the financial amount before mutating the aggregate.
             */
            if (
                Number.isInteger(event.amountInMinorUnits) &&
                event.amountInMinorUnits !== payment.amount
            ) {
                throw new ValidationError(
                    `Stripe amount mismatch for payment '${payment.id}'.`
                );
            }

            const paidAt = event.created
                ? new Date(event.created * 1000)
                : this.clock.now();

            payment.markSuccessful({
                gatewayTransactionId: event.transactionId,
                paidAt,
                correlationId: context.correlationId,
            });

            await this.paymentRepository.update(payment, {
                transaction: trx,
            });

            for (const domainEvent of payment.pullDomainEvents()) {
                await this.outboxRepository.save(domainEvent, trx);
            }

            this.logger.info?.({
                paymentId: payment.id,
                eventId: event.eventId,
                transactionId: event.transactionId,
            }, "Stripe payment successfully applied.");

            return {
                success: true,
                processed: true,
                duplicate: false,
                payment: payment.toResponse(),
                eventId: event.eventId,
            };
        });
    }
}
