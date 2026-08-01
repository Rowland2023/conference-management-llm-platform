// src/conference-management/accounting-services/ledger/index.js

import { Router } from "express";

import { PostgresAccountRepository }
    from "./infrastructure/repositories/postgres-account.repository.js";

import { PostgresJournalEntryRepository }
    from "./infrastructure/repositories/postgres-journal-entry.repository.js";

import { PostgresHoldRepository }
    from "./infrastructure/repositories/postgres-hold.repository.js";

import { CreateAccountUseCase }
    from "./application/create-account.usecase.js";

import { PostJournalEntryUseCase }
    from "./application/post-journal-entry.usecase.js";

import { ReverseJournalEntryUseCase }
    from "./application/reverse-journal-entry.usecase.js";

import { GetLedgerBalanceUseCase }
    from "./application/get-ledger-balance.usecase.js";

import { CreateHoldUseCase }
    from "./application/create-hold.usecase.js";

import AccountController
    from "./presentation/controller/account.controller.js";

import JournalController
    from "./presentation/controller/journal.controller.js";

import HoldController
    from "./presentation/controller/hold.controller.js";

import createAccountRoutes
    from "./presentation/router/account.routes.js";

import createJournalRoutes
    from "./presentation/router/journal.routes.js";

import createHoldRoutes
    from "./presentation/router/hold.routes.js";


export function createLedgerModule({
    unitOfWorkFactory,
    outboxRepository,
    logger,
}) {

    const uow =
        unitOfWorkFactory();


    // ======================================================
    // Repositories
    // ======================================================

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



    // ======================================================
    // Use Cases
    // ======================================================

    const createAccountUseCase =
        new CreateAccountUseCase({
            accountRepository,
            outboxRepository,
            uow,
            logger,
        });


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



    // ======================================================
    // Controllers
    // ======================================================

    const accountController =
        new AccountController({
            createAccountUseCase,
            getAccountBalanceUseCase:
                getLedgerBalanceUseCase,
        });


    const journalController =
        new JournalController({
            postJournalEntryUseCase,
            reverseJournalEntryUseCase,
        });


    const holdController =
        new HoldController({
            createHoldUseCase,
        });



    // ======================================================
    // Router
    // ======================================================

    const router =
        Router();


    router.use(
        "/accounts",
        createAccountRoutes(accountController)
    );


    router.use(
        "/journals",
        createJournalRoutes(journalController)
    );


    router.use(
        "/holds",
        createHoldRoutes(holdController)
    );



    // ======================================================
    // Public Module API
    // ======================================================

    return {

        name: "ledger",

        router,

        controllers: {
            accountController,
            journalController,
            holdController,
        },

        repositories: {
            accountRepository,
            journalRepository,
            holdRepository,
        },

        useCases: {
            createAccountUseCase,
            postJournalEntryUseCase,
            reverseJournalEntryUseCase,
            getLedgerBalanceUseCase,
            createHoldUseCase,
        },
    };
}