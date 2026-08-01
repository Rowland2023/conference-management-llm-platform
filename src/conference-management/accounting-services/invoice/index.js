// src/conference-management/accounting-services/invoice/index.js

import createInvoiceRoutes
    from "./presentation/routes/invoice.routes.js";

import { InvoiceController }
    from "./presentation/controller/InvoiceController.js";

import { PostgresInvoiceRepository }
    from "./infrastructure/repositories/PostgresInvoiceRepository.js";

import { CreateInvoiceUseCase }
    from "./application/use_case/CreateInvoiceUseCase.js";

import { CancelInvoiceUseCase }
    from "./application/use_case/CancelInvoiceUseCase.js";

import { IssueInvoiceUseCase }
    from "./application/use_case/IssueInvoiceUseCase.js";

import { RecordPaymentUseCase }
    from "./application/use_case/RecordPaymentUseCase.js";


export function createInvoiceModule({

    db,
    logger = console,

}) {

    if (!db) {
        throw new Error(
            "InvoiceModule: db is required."
        );
    }

    // ======================================================
    // Infrastructure
    // ======================================================

    const invoiceRepository =
        new PostgresInvoiceRepository({

            db,

        });


    // ======================================================
    // Application
    // ======================================================

    const createInvoiceUseCase =
        new CreateInvoiceUseCase({

            invoiceRepository,
            logger,

        });

    const cancelInvoiceUseCase =
        new CancelInvoiceUseCase({

            invoiceRepository,
            logger,

        });

    const issueInvoiceUseCase =
        new IssueInvoiceUseCase({

            invoiceRepository,
            logger,

        });

    const recordPaymentUseCase =
        new RecordPaymentUseCase({

            invoiceRepository,
            logger,

        });


    // ======================================================
    // Presentation
    // ======================================================

    const invoiceController =
        new InvoiceController({

            createInvoiceUseCase,
            cancelInvoiceUseCase,
            issueInvoiceUseCase,
            recordPaymentUseCase,

        });

    const router =
        createInvoiceRoutes({

            invoiceController,

        });


    // ======================================================
    // Module API
    // ======================================================

    return {

        router,

        controller: invoiceController,

        repository: invoiceRepository,

        useCases: {

            createInvoiceUseCase,
            cancelInvoiceUseCase,
            issueInvoiceUseCase,
            recordPaymentUseCase,

        },

    };

}