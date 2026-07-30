// src/conference-management/accounting-services/index.js
// Composition Root for Accounting Services Bounded Context

import { UnitOfWork } from "../../shared/application/persistence/UnitOfWork.js";

// Ledger
import { PostgresAccountRepository }
    from "./ledger/infrastructure/repositories/postgres-account.repository.js";

import { PostgresHoldRepository }
    from "./ledger/infrastructure/repositories/postgres-hold.repository.js";

import { PostgresJournalEntryRepository }
    from "./ledger/infrastructure/repositories/postgres-journal-entry.repository.js";

import { PostJournalEntryUseCase }
    from "./ledger/application/post-journal-entry.usecase.js";

import { GetLedgerBalanceUseCase }
    from "./ledger/application/get-ledger-balance.usecase.js";

import { CreateHoldUseCase }
    from "./ledger/application/create-hold.usecase.js";

import { ReverseJournalEntryUseCase }
    from "./ledger/application/reverse-journal-entry.usecase.js";


// Payments
import { PostgresPaymentRepository }
    from "./Payment/infrastructure/persistance/repositories/PostgresPaymentRepository.js";


// Invoice
import { PostgresInvoiceRepository }
    from "./invoice/infrastructure/repositories/PostgresInvoiceRepository.js";


// Refund
import { RefundRepository }
    from "./refund/infrastructure/repositories/RefundRepository.js";


// Routes / Presentation
import createAccountRoutes
    from "./ledger/presentation/router/account.routes.js";

import createJournalRoutes
    from "./ledger/presentation/router/journal.routes.js";

import createHoldRoutes
    from "./ledger/presentation/router/hold.routes.js";

import createPaymentRoutes
    from "./Payment/api/payment.route.js";

import createInvoiceRoutes
    from "./invoice/presentation/routes/invoice.routes.js";


/**
 * Accounting Module Composition Root
 */
export function createAccountingServicesModule({
    db,
    unitOfWorkFactory,
    eventBus,
    outboxRepository,
    outboxWorker,
    logger,
}) {

    // --------------------------------------------------
    // Dependency Validation
    // --------------------------------------------------

    if (!db)
        throw new Error(
            "AccountingServicesModule: db is required."
        );

    if (!unitOfWorkFactory)
        throw new Error(
            "AccountingServicesModule: unitOfWorkFactory is required."
        );

    if (!eventBus)
        throw new Error(
            "AccountingServicesModule: eventBus is required."
        );

    if (!outboxRepository)
        throw new Error(
            "AccountingServicesModule: outboxRepository is required."
        );

    if (!outboxWorker)
        throw new Error(
            "AccountingServicesModule: outboxWorker is required."
        );

    if (!logger)
        throw new Error(
            "AccountingServicesModule: logger is required."
        );


    // --------------------------------------------------
    // Transaction Boundary
    // --------------------------------------------------

    const uow = unitOfWorkFactory();


    // --------------------------------------------------
    // Infrastructure
    // --------------------------------------------------

    const accountRepository =
        new PostgresAccountRepository({
            uow,
        });


    const journalRepository =
        new PostgresJournalEntryRepository({
            uow,
        });


    const holdRepository =
        new PostgresHoldRepository({
            uow,
        });


    const paymentRepository =
        new PostgresPaymentRepository({
            uow,
        });


    const invoiceRepository =
        new PostgresInvoiceRepository({
            uow,
        });


    const refundRepository =
        new RefundRepository({
            uow,
        });



    // --------------------------------------------------
    // Application Services
    // --------------------------------------------------

    const postJournalEntryUseCase =
        new PostJournalEntryUseCase({
            journalRepository,
            accountRepository,
            outboxRepository,
            uow,
            logger,
        });


    const reverseJournalEntryUseCase =
        new ReverseJournalEntryUseCase({
            journalRepository,
            accountRepository,
            outboxRepository,
            uow,
            logger,
        });


    const getLedgerBalanceUseCase =
        new GetLedgerBalanceUseCase({
            accountRepository,
            logger,
        });


    const createHoldUseCase =
        new CreateHoldUseCase({
            holdRepository,
            accountRepository,
            outboxRepository,
            uow,
            logger,
        });



    // --------------------------------------------------
    // Event Integration
    // --------------------------------------------------

    let subscriptionToken = null;


    return {


        /**
         * Expose presentation layer
         */
        routes: {

            accounts:
                createAccountRoutes,

            journals:
                createJournalRoutes,

            holds:
                createHoldRoutes,

            payments:
                createPaymentRoutes,

            invoices:
                createInvoiceRoutes,
        },



        /**
         * Event subscriptions
         */
        subscribe() {

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
                                "Failed processing payment.released event"
                            );

                        }

                    }
                );

        },



        /**
         * Lifecycle start
         */
        async start() {

            logger.info(
                "Accounting Services started."
            );

            // shared worker owns startup
            if (outboxWorker.start) {
                await outboxWorker.start();
            }

        },



        /**
         * Lifecycle stop
         */
        async stop() {


            logger.info(
                "Stopping Accounting Services..."
            );


            if (
                subscriptionToken &&
                typeof eventBus.unsubscribe === "function"
            ) {

                eventBus.unsubscribe(
                    "payment.released",
                    subscriptionToken
                );

            }


            if (outboxWorker.stop) {

                await outboxWorker.stop();

            }

        },

    };

}