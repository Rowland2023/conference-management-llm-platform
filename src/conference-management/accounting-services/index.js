// src/conference-management/accounting-services/index.js
//
// Composition Root:
// Accounting Services Bounded Context
//

import { UnitOfWork } 
    from "../../shared/application/persistence/UnitOfWork.js";

import { PostgresOutboxRepository }
    from "../../shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js";

import { OutboxWorker }
    from "../../shared/infrastructure/messaging/outbox/OutboxWorker.js";

import { KafkaDispatcher }
    from "../../shared/infrastructure/messaging/outbox/KafkaDispatcher.js";


// Ledger Infrastructure

import { PostgresAccountRepository }
    from "./ledger/infrastructure/repositories/postgres-account.repository.js";

import { PostgresHoldRepository }
    from "./ledger/infrastructure/repositories/postgres-hold.repository.js";

import { PostgresJournalEntryRepository }
    from "./ledger/infrastructure/repositories/postgres-journal-entry.repository.js";


// Payment Infrastructure

import { PostgresPaymentRepository }
    from "./Payment/infrastructure/persistance/repositories/PostgresPaymentRepository.js";


// Invoice Infrastructure

import { PostgresInvoiceRepository }
    from "./invoice/infrastructure/repositories/PostgresInvoiceRepository.js";


// Refund Infrastructure

import { RefundRepository }
    from "./refund/infrastructure/repositories/RefundRepository.js";


// Application

import { PostJournalEntryUseCase }
    from "./ledger/application/post-journal-entry.usecase.js";

import { ReverseJournalEntryUseCase }
    from "./ledger/application/reverse-journal-entry.usecase.js";

import { GetLedgerBalanceUseCase }
    from "./ledger/application/get-ledger-balance.usecase.js";

import { CreateHoldUseCase }
    from "./ledger/application/create-hold.usecase.js";



export function createAccountingServicesModule({
    dbConnection,
    eventBus,
    kafkaProducer,
    topicResolver,
    logger
}) {


    /*
    |--------------------------------------------------------------------------
    | Validate Dependencies
    |--------------------------------------------------------------------------
    */

    if (!dbConnection) {
        throw new Error(
            "AccountingServicesModule requires dbConnection."
        );
    }


    if (!eventBus) {
        throw new Error(
            "AccountingServicesModule requires eventBus."
        );
    }


    if (!logger) {
        throw new Error(
            "AccountingServicesModule requires logger."
        );
    }



    /*
    |--------------------------------------------------------------------------
    | Transaction Boundary
    |--------------------------------------------------------------------------
    */

    const uow =
        new UnitOfWork(dbConnection);



    /*
    |--------------------------------------------------------------------------
    | Persistence Layer
    |--------------------------------------------------------------------------
    */

    const accountRepository =
        new PostgresAccountRepository({
            uow
        });


    const journalRepository =
        new PostgresJournalEntryRepository({
            uow
        });


    const holdRepository =
        new PostgresHoldRepository({
            uow
        });


    const paymentRepository =
        new PostgresPaymentRepository({
            uow
        });


    const invoiceRepository =
        new PostgresInvoiceRepository({
            uow
        });


    const refundRepository =
        new RefundRepository({
            uow
        });



    /*
    |--------------------------------------------------------------------------
    | Transactional Outbox
    |--------------------------------------------------------------------------
    */

    const outboxRepository =
        new PostgresOutboxRepository({
            knex: dbConnection
        });



    const dispatcher =
    new KafkaDispatcher({
        kafkaProducer,
        topicResolver
    });



    const outboxWorker =
        new OutboxWorker({
            outboxRepository,
            dispatcher,
            logger
        });



    /*
    |--------------------------------------------------------------------------
    | Application Services
    |--------------------------------------------------------------------------
    */

    const postJournalEntryUseCase =
        new PostJournalEntryUseCase({

            journalRepository,

            accountRepository,

            outboxRepository,

            uow,

            logger

        });



    const reverseJournalEntryUseCase =
        new ReverseJournalEntryUseCase({

            journalRepository,

            accountRepository,

            outboxRepository,

            uow,

            logger

        });



    const getLedgerBalanceUseCase =
        new GetLedgerBalanceUseCase({

            accountRepository,

            logger

        });



    const createHoldUseCase =
        new CreateHoldUseCase({

            holdRepository,

            accountRepository,

            outboxRepository,

            uow,

            logger

        });



    /*
    |--------------------------------------------------------------------------
    | Event Subscription State
    |--------------------------------------------------------------------------
    */

    let subscriptionToken = null;



    /*
    |--------------------------------------------------------------------------
    | Module API
    |--------------------------------------------------------------------------
    */

    return {


        services: {

            accountRepository,

            journalRepository,

            holdRepository,

            paymentRepository,

            invoiceRepository,

            refundRepository,


            postJournalEntryUseCase,

            reverseJournalEntryUseCase,

            getLedgerBalanceUseCase,

            createHoldUseCase

        },



        /*
        |--------------------------------------------------------------------------
        | Domain Event Consumers
        |--------------------------------------------------------------------------
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
                                    event.correlationId

                            });


                        } catch(error) {


                            logger.error(
                                "Failed processing payment.released",
                                {
                                    error,
                                    eventId: event.id
                                }
                            );


                        }

                    }

                );

        },



        /*
        |--------------------------------------------------------------------------
        | Background Workers
        |--------------------------------------------------------------------------
        */

        async start() {

            logger.info(
                "Starting Accounting Services Outbox Worker..."
            );


            await outboxWorker.start();

        },



        async stop() {

            logger.info(
                "Stopping Accounting Services Outbox Worker..."
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


            await outboxWorker.stop();

        }

    };

}