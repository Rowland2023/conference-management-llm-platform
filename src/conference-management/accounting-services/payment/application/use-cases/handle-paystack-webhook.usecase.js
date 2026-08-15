import { NotFoundError, ValidationError } from "../../domain/errors/PaymentErrors.js";

export class HandlePaystackWebhookUseCase {
    constructor({
        paymentRepository,
        outboxRepository,
        unitOfWork,
        paystackWebhookVerifier,
        logger = console,
        clock = { now: () => new Date() },
    }) {
        if (!paymentRepository) {
            throw new Error("HandlePaystackWebhookUseCase requires paymentRepository.");
        }

        if (!outboxRepository) {
            throw new Error("HandlePaystackWebhookUseCase requires outboxRepository.");
        }

        if (!unitOfWork) {
            throw new Error("HandlePaystackWebhookUseCase requires unitOfWork.");
        }

        if (!paystackWebhookVerifier) {
            throw new Error("HandlePaystackWebhookUseCase requires paystackWebhookVerifier.");
        }

        this.paymentRepository = paymentRepository;
        this.outboxRepository = outboxRepository;
        this.unitOfWork = unitOfWork;
        this.paystackWebhookVerifier = paystackWebhookVerifier;
        this.logger = logger;
        this.clock = clock;
    }

    async execute({ rawBody, signatureHeader, context = {} }) {
        if (!rawBody) {
            throw new ValidationError("Raw Paystack webhook body is required.");
        }

        const event = this.paystackWebhookVerifier.verify(
            rawBody,
            signatureHeader
        );

        this.logger.info?.({
            eventId: event.eventId,
            eventType: event.eventType,
            transactionId: event.transactionId,
            reference: event.reference,
        }, "Paystack webhook verified.");

        /*
         * Only successful payment events mutate the Payment aggregate here.
         *
         * Other Paystack events can be acknowledged without changing
         * payment state until their explicit lifecycle behavior is defined.
         */
        if (event.eventType !== "charge.success") {
            this.logger.info?.({
                eventId: event.eventId,
                eventType: event.eventType,
            }, "Paystack webhook acknowledged without payment mutation.");

            return {
                success: true,
                processed: false,
                eventId: event.eventId,
                eventType: event.eventType,
            };
        }

        if (!event.reference && !event.transactionId) {
            throw new ValidationError(
                "Paystack webhook does not contain a payment reference or transaction ID."
            );
        }

        return this.unitOfWork.execute(async (trx) => {
            let payment = null;

            /*
             * Paystack reference is the strongest correlation key because
             * initializeTransaction() sends the payment reference to Paystack.
             */
            if (event.reference) {
                payment = await this.paymentRepository.findByExternalReference(
                    event.reference,
                    { transaction: trx }
                );
            }

            /*
             * Fallback to the gateway transaction ID.
             */
            if (!payment && event.transactionId) {
                payment = await this.paymentRepository.findByGatewayTransactionId(
                    event.transactionId,
                    { transaction: trx }
                );
            }

            if (!payment) {
                throw new NotFoundError(
                    `Payment not found for Paystack reference '${event.reference || event.transactionId}'.`
                );
            }

            /*
             * Idempotent webhook handling.
             *
             * Paystack can deliver the same webhook more than once.
             * Once the payment is already successful, acknowledge it without
             * generating another state transition.
             */
            if (payment.isSuccessful()) {
                this.logger.info?.({
                    paymentId: payment.id,
                    eventId: event.eventId,
                }, "Paystack webhook already processed.");

                return {
                    success: true,
                    processed: false,
                    duplicate: true,
                    payment: payment.toResponse(),
                    eventId: event.eventId,
                };
            }

            /*
             * Optional financial consistency check.
             *
             * Paystack sends the amount in minor units.
             */
            if (
                Number.isInteger(event.amountInMinorUnits) &&
                event.amountInMinorUnits !== payment.amount
            ) {
                throw new ValidationError(
                    `Paystack amount mismatch for payment '${payment.id}'.`
                );
            }

            const paidAt = event.rawEvent?.data?.paid_at
                ? new Date(event.rawEvent.data.paid_at)
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
            }, "Paystack payment successfully applied.");

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
