// src/conference-management/accounting-services/reconciliation/index.js

import { Router } from "express";

// ======================================================
// Infrastructure
// ======================================================

import { ReconciliationRepositoryImpl }
    from "./infrastructure/persistence/ReconciliationRepositoryImpl.js";

// ======================================================
// Application Services (optional)
// ======================================================

import { ReconciliationService }
    from "./application/services/ReconciliationService.js";

// ======================================================
// Use Cases
// ======================================================

import { StartReconciliationUseCase }
    from "./application/use_cases/StartReconciliationUseCase.js";

import { DetectDiscrepanciesUseCase }
    from "./application/use_cases/DetectDiscrepanciesUseCase.js";

import { ResolveDiscrepancyUseCase }
    from "./application/use_cases/ResolveDiscrepancyUseCase.js";

import { CompleteReconciliationUseCase }
    from "./application/use_cases/CompleteReconciliationUseCase.js";

import { ListReconciliationsUseCase }
    from "./application/use_cases/ListReconciliationsUseCase.js";

// ======================================================
// Presentation
// ======================================================

import { ReconciliationController }
    from "./presentation/controllers/ReconciliationController.js";

import { createReconciliationRouter }
    from "./presentation/routes/reconciliation.routes.js";



export function createReconciliationModule(shared) {

    const {

        knex,

        eventBus,

        logger,

        authMiddleware,

        validate,

    } = shared;



    // ======================================================
    // Repository
    // ======================================================

    const reconciliationRepository =
        new ReconciliationRepositoryImpl(knex);



    // ======================================================
    // Use Cases
    // ======================================================

    const startReconciliationUseCase =
        new StartReconciliationUseCase({

            reconciliationRepository,

            eventBus,

            logger,

        });



    const detectDiscrepanciesUseCase =
        new DetectDiscrepanciesUseCase({

            reconciliationRepository,

            logger,

        });



    const resolveDiscrepancyUseCase =
        new ResolveDiscrepancyUseCase({

            reconciliationRepository,

            eventBus,

            logger,

        });



    const completeReconciliationUseCase =
        new CompleteReconciliationUseCase({

            reconciliationRepository,

            eventBus,

            logger,

        });



    const listReconciliationsUseCase =
        new ListReconciliationsUseCase({

            reconciliationRepository,

        });



    // ======================================================
    // Application Service
    // ======================================================

    const reconciliationService =
        new ReconciliationService({

            startReconciliationUseCase,

            detectDiscrepanciesUseCase,

            resolveDiscrepancyUseCase,

            completeReconciliationUseCase,

        });



    // ======================================================
    // Controller
    // ======================================================

    const controller =
        new ReconciliationController({

            reconciliationService,

            listReconciliationsUseCase,

        });



    // ======================================================
    // Routes
    // ======================================================

    const router =
        createReconciliationRouter({

            controller,

            authMiddleware,

            validate,

        });



    return {

        name: "reconciliation",

        router,

        useCases: {

            startReconciliationUseCase,

            detectDiscrepanciesUseCase,

            resolveDiscrepancyUseCase,

            completeReconciliationUseCase,

            listReconciliationsUseCase,

        },

        services: {

            reconciliationService,

        },

        repositories: {

            reconciliationRepository,

        },

        async start() {

            logger.info(
                "Reconciliation module started."
            );

        },

        async stop() {

            logger.info(
                "Reconciliation module stopped."
            );

        },

    };

}