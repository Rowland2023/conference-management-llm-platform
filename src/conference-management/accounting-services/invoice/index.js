// invoice/index.js

import createInvoiceRoutes
    from "./presentation/routes/invoice.routes.js";

import { InvoiceController }
    from "./presentation/controller/InvoiceController.js";

import { PostgresInvoiceRepository }
    from "./infrastructure/persistence/PostgresInvoiceRepository.js";

import { InvoicePricingService }
    from "./domain/services/InvoicePricingService.js";

import { InvoiceService }
    from "./application/services/InvoiceService.js";

import { CreateInvoiceUseCase }
    from "./application/use_cases/CreateInvoiceUseCase.js";

import { CancelInvoiceUseCase }
    from "./application/use_cases/CancelInvoiceUseCase.js";

import { IssueInvoiceUseCase }
    from "./application/use_cases/IssueInvoiceUseCase.js";

import { RecordPaymentUseCase }
    from "./application/use_cases/RecordPaymentUseCase.js";


export function createInvoiceModule({

    knex,

    transactionManager,

    eventBus,

    logger = console,

}) {

    //--------------------------------------------------
    // Validation
    //--------------------------------------------------

    if (!knex) {

        throw new Error(

            "InvoiceModule: knex is required."

        );

    }

    if (!transactionManager) {

        throw new Error(

            "InvoiceModule: transactionManager is required."

        );

    }

    if (!eventBus) {

        throw new Error(

            "InvoiceModule: eventBus is required."

        );

    }


    //--------------------------------------------------
    // Infrastructure
    //--------------------------------------------------

    const invoiceRepository =
        new PostgresInvoiceRepository({

            knex,

        });


    //--------------------------------------------------
    // Domain
    //--------------------------------------------------

    const invoicePricingService =
        new InvoicePricingService();


    //--------------------------------------------------
    // Application
    //--------------------------------------------------

    const createInvoiceUseCase =
        new CreateInvoiceUseCase({

            invoiceRepository,

            invoicePricingService,

            transactionManager,

            eventBus,

            logger,

        });


    const cancelInvoiceUseCase =
        new CancelInvoiceUseCase({

            invoiceRepository,

            transactionManager,

            eventBus,

            logger,

        });


    const issueInvoiceUseCase =
        new IssueInvoiceUseCase({

            invoiceRepository,

            transactionManager,

            eventBus,

            logger,

        });


    const recordPaymentUseCase =
        new RecordPaymentUseCase({

            invoiceRepository,

            transactionManager,

            eventBus,

            logger,

        });


    const invoiceService =
        new InvoiceService({

            createInvoiceUseCase,

            cancelInvoiceUseCase,

            issueInvoiceUseCase,

            recordPaymentUseCase,

        });


    //--------------------------------------------------
    // Presentation
    //--------------------------------------------------

    const invoiceController =
        new InvoiceController({

            invoiceService,

        });


    const router =
        createInvoiceRoutes({

            invoiceController,

        });


    //--------------------------------------------------
    // Module API
    //--------------------------------------------------

    return {

        name: "invoice",

        router,

        controller:
            invoiceController,

        service:
            invoiceService,

        repository:
            invoiceRepository,

        useCases: {

            createInvoiceUseCase,

            cancelInvoiceUseCase,

            issueInvoiceUseCase,

            recordPaymentUseCase,

        },

    };

}