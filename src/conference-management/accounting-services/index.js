// src/conference-management/accounting-services/index.js

import { Router } from "express";

import { createLedgerModule } from "./ledger/index.js";
import { createPaymentModule } from "./payment/index.js";
import { createInvoiceModule } from "./invoice/index.js";
import { createRefundModule } from "./refund/index.js";
import { createReconciliationModule } from "./reconciliation/index.js";
import { createSettlementModule } from "./settlement/index.js";
import { createTaxModule } from "./tax/index.js";

export function createAccountingServicesModule(shared) {

    const {
        eventBus,
        outboxWorker,
        logger,
    } = shared;

    // ======================================================
    // Create Bounded Contexts
    // ======================================================

    const ledgerModule =
        createLedgerModule(shared);

    const paymentModule =
        createPaymentModule(shared);

    const invoiceModule =
        createInvoiceModule(shared);

    const refundModule =
        createRefundModule(shared);

    const reconciliationModule =
        createReconciliationModule(shared);

    const settlementModule =
        createSettlementModule(shared);

    const taxModule =
        createTaxModule(shared);

    // ======================================================
    // Router
    // ======================================================

    const router = Router();

    router.use("/ledger", ledgerModule.router);

    router.use("/payments", paymentModule.router);

    router.use("/invoices", invoiceModule.router);

    router.use("/refunds", refundModule.router);

    router.use("/reconciliation", reconciliationModule.router);

    router.use("/settlements", settlementModule.router);

    router.use("/tax", taxModule.router);

    // ======================================================
    // Event Subscription
    // ======================================================

    let subscriptionToken = null;

    return {

        name: "accounting-services",

        basePath: "/api/accounting",

        router,

        subscribe() {

            // Allow each bounded context to register
            // its own event subscriptions.

            ledgerModule.subscribe?.();

            paymentModule.subscribe?.();

            invoiceModule.subscribe?.();

            refundModule.subscribe?.();

            reconciliationModule.subscribe?.();

            settlementModule.subscribe?.();

            taxModule.subscribe?.();

            // --------------------------------------------------
            // Temporary cross-context subscription.
            // Move this into Ledger later.
            // --------------------------------------------------

            const postJournalEntryUseCase =
                ledgerModule.useCases?.postJournalEntryUseCase;

            if (!postJournalEntryUseCase) {
                return;
            }

            subscriptionToken =
                eventBus.subscribe(
                    "payment.released",
                    async (event) => {

                        try {

                            await postJournalEntryUseCase.execute({

                                transactionId:
                                    event.payload.transactionId,

                                amount:
                                    event.payload.amount,

                                correlationId:
                                    event.correlationId,

                            });

                        } catch (error) {

                            logger.error(
                                {
                                    error,
                                    eventId: event.id,
                                },
                                "Failed processing payment.released"
                            );

                        }

                    }
                );

        },

        async start() {

            await ledgerModule.start?.();

            await paymentModule.start?.();

            await invoiceModule.start?.();

            await refundModule.start?.();

            await reconciliationModule.start?.();

            await settlementModule.start?.();

            await taxModule.start?.();

            logger.info(
                "Accounting Services started."
            );

        },

        async stop() {

            if (
                subscriptionToken &&
                typeof eventBus.unsubscribe === "function"
            ) {

                eventBus.unsubscribe(
                    "payment.released",
                    subscriptionToken
                );

            }

            await ledgerModule.stop?.();

            await paymentModule.stop?.();

            await invoiceModule.stop?.();

            await refundModule.stop?.();

            await reconciliationModule.stop?.();

            await settlementModule.stop?.();

            await taxModule.stop?.();

            // Stop shared infrastructure last.
            await outboxWorker?.stop?.();

            logger.info(
                "Accounting Services stopped."
            );

        },

    };

}