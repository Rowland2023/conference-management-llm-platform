// src/conference-management/accounting-services/index.js

import { Router } from "express";

import { createLedgerModule } from "./ledger/index.js";
import { createPaymentModule } from "./payment/index.js";
import { createInvoiceModule } from "./invoice/index.js";


export function createAccountingServicesModule(shared) {

    const {
        eventBus,
        outboxWorker,
        logger,
    } = shared;


    const ledgerModule =
        createLedgerModule(shared);


    const paymentModule =
        createPaymentModule(shared);


    const invoiceModule =
        createInvoiceModule(shared);



    const router =
        Router();



    // ======================================================
    // Domain Routes
    // ======================================================

    router.use(
        "/ledger",
        ledgerModule.router
    );


    router.use(
        "/payments",
        paymentModule.router
    );


    router.use(
        "/invoices",
        invoiceModule.router
    );



    let subscriptionToken = null;



    return {

        name: "accounting-services",

        basePath: "/api/accounting",

        router,



        subscribe() {

            const postJournalEntryUseCase =
                ledgerModule.useCases
                    ?.postJournalEntryUseCase;


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


            await outboxWorker?.stop?.();

        },

    };

}