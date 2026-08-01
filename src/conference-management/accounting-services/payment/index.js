// src/conference-management/accounting-services/payment/index.js
import { randomUUID } from "crypto";
import createPaymentRouter from "./api/payment.route.js";

import { PaymentController } from "./api/payment.controller.js";
import { PaymentWebhookController } from "./api/paymentWebhook.controller.js";

import { CreatePaymentUseCase } from "./application/use-cases/create-payment.usecase.js";
import { GetAllPaymentsUseCase } from "./application/use-cases/get-all-payments.usecase.js";
import { GetPaymentByIdUseCase } from "./application/use-cases/get-payment-by-id.usecase.js";
import { RefundPaymentUseCase } from "./application/use-cases/refund-payment.usecase.js";

import { PaystackPaymentGateway } from "./infrastructure/gateways/PaystackPaymentGateway.js";
import { StripePaymentGateway } from "./infrastructure/gateways/StripPaymentGateway.js";

import { RedisLockManager } from "./infrastructure/locks/RedisLockManager.js";

import { PaymentMapper } from "./infrastructure/persistence/mappers/PaymentMapper.js";
import { PostgresPaymentRepository } from "./infrastructure/persistence/repositories/PostgresPaymentRepository.js";
import { PostgresRefundRepository } from "./infrastructure/persistence/repositories/PostgresRefundRepository.js";

import { PaystackWebhookVerifier } from "./infrastructure/webhook/PaystackWebhookVerifier.js";
import { StripeWebhookVerifier } from "./infrastructure/webhook/StripeWebhookVerifier.js";


export function createPaymentModule(shared) {

    const {
        db,
        config,
        logger,
        outboxRepository,
        redis,
        unitOfWorkFactory,
    } = shared;


    // ======================================================
    // Infrastructure
    // ======================================================

    const paymentRepository =
        new PostgresPaymentRepository({
            db,
            paymentMapper: new PaymentMapper(),
        });


    const refundRepository =
        new PostgresRefundRepository({
            db,
        });


    const lockManager =
        new RedisLockManager({
            redis,
            logger,
            namespace: "payments",
        });


    const unitOfWork =
    unitOfWorkFactory();


const idGenerator = {
    generate() {
        return randomUUID();
    },
};


const clock = {
    now() {
        return new Date();
    },
};


    // ======================================================
    // Payment Providers
    // ======================================================

    const paystackGateway =
        config.paystack?.secretKey
            ? new PaystackPaymentGateway({
                config,
                logger,
            })
            : null;


    const stripeGateway =
        config.stripe?.secretKey
            ? new StripePaymentGateway({
                config,
                logger,
            })
            : null;



    // ======================================================
    // Payment Gateway Factory
    // ======================================================

    const paymentGatewayFactory = {

        getGateway(provider) {

            switch (provider) {

                case "stripe":

                    if (!stripeGateway) {
                        throw new Error(
                            "Stripe gateway is not configured"
                        );
                    }

                    return stripeGateway;


                case "paystack":

                    if (!paystackGateway) {
                        throw new Error(
                            "Paystack gateway is not configured"
                        );
                    }

                    return paystackGateway;


                default:

                    throw new Error(
                        `Unsupported payment provider: ${provider}`
                    );
            }
        },
    };



    // ======================================================
    // Webhook Verifiers
    // ======================================================

    const paystackWebhookVerifier =
        config.paystack?.webhookSecret
            ? new PaystackWebhookVerifier({
                secret: config.paystack.webhookSecret,
            })
            : null;


    const stripeWebhookVerifier =
        config.stripe?.webhookSecret
            ? new StripeWebhookVerifier({
                secret: config.stripe.webhookSecret,
            })
            : null;



    // ======================================================
    // Use Cases
    // ======================================================

    const createPaymentUseCase =
        new CreatePaymentUseCase({
            paymentRepository,
            paymentGatewayFactory,
            lockManager,
            outboxRepository,
            logger,
        });


    const refundPaymentUseCase =
    new RefundPaymentUseCase({
        paymentRepository,
        refundRepository,
        paymentGatewayFactory,
        unitOfWork,
        idGenerator,
        clock,
        lockManager,
        outboxRepository,
        logger,
    });
    
    const getPaymentByIdUseCase =
        new GetPaymentByIdUseCase({
            paymentRepository,
            logger,
        });


    const getAllPaymentsUseCase =
        new GetAllPaymentsUseCase({
            paymentRepository,
            logger,
        });



    // ======================================================
    // Controllers
    // ======================================================

    const paymentController =
        new PaymentController({
            createPaymentUseCase,
            refundPaymentUseCase,
            getPaymentByIdUseCase,
            getAllPaymentsUseCase,
        });


    const paymentWebhookController =
        new PaymentWebhookController({
            paymentRepository,
            refundRepository,
            paystackGateway,
            stripeGateway,
            paystackWebhookVerifier,
            stripeWebhookVerifier,
            lockManager,
            outboxRepository,
            logger,
        });



    // ======================================================
    // Router
    // ======================================================

    const router =
        createPaymentRouter({
            paymentController,
            paymentWebhookController,
        });



    // ======================================================
    // Public Module API
    // ======================================================

    return {

        router,

        controllers: {
            paymentController,
            paymentWebhookController,
        },

        repositories: {
            paymentRepository,
            refundRepository,
        },

        gateways: {
            paystackGateway,
            stripeGateway,
            paymentGatewayFactory,
        },

        useCases: {
            createPaymentUseCase,
            refundPaymentUseCase,
            getPaymentByIdUseCase,
            getAllPaymentsUseCase,
        },

        infrastructure: {
            lockManager,
            unitOfWork,
        },
    };
}