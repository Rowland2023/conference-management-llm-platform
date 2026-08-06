// tax/container.js

import { TaxPolicy }
    from "./domain/policies/TaxPolicy.js";

import { TaxRepository }
    from "./infrastructure/persistence/TaxRepository.js";

import { CalculateTaxUseCase }
    from "./application/use_cases/CalculateTaxUseCase.js";

import { RecordTaxUseCase }
    from "./application/use_cases/RecordTaxUseCase.js";

import { PayTaxUseCase }
    from "./application/use_cases/PayTaxUseCase.js";

import { GetTaxUseCase }
    from "./application/use_cases/GetTaxUseCase.js";

import { ListTaxesUseCase }
    from "./application/use_cases/ListTaxesUseCase.js";

import { TaxService }
    from "./application/services/TaxService.js";

import { TaxController }
    from "./presentation/controllers/TaxController.js";

import { createTaxRouter }
    from "./presentation/routes/tax.routes.js";


export function createTaxContainer(shared) {

    const {

        knex,

        eventBus,

        transactionManager,

        logger,

    } = shared;


    //--------------------------------------------------
    // Domain
    //--------------------------------------------------

    const taxPolicy =
        new TaxPolicy();


    //--------------------------------------------------
    // Infrastructure
    //--------------------------------------------------

    const taxRepository =
        new TaxRepository({

            knex,

        });


    //--------------------------------------------------
    // Application
    //--------------------------------------------------

    const calculateTaxUseCase =
        new CalculateTaxUseCase({

            taxRepository,

            taxPolicy,

            transactionManager,

            eventBus,

            logger,

        });


    const recordTaxUseCase =
        new RecordTaxUseCase({

            taxRepository,

            transactionManager,

            eventBus,

            logger,

        });


    const payTaxUseCase =
        new PayTaxUseCase({

            taxRepository,

            transactionManager,

            eventBus,

            logger,

        });


    const getTaxUseCase =
        new GetTaxUseCase({

            taxRepository,

            logger,

        });


    const listTaxesUseCase =
        new ListTaxesUseCase({

            taxRepository,

            logger,

        });


    //--------------------------------------------------
    // Application Service
    //--------------------------------------------------

    const taxService =
        new TaxService({

            calculateTaxUseCase,

            recordTaxUseCase,

            payTaxUseCase,

            getTaxUseCase,

            listTaxesUseCase,

        });


    //--------------------------------------------------
    // Presentation
    //--------------------------------------------------

    const taxController =
        new TaxController({

            taxService,

        });


    const router =
        createTaxRouter({

            taxController,

        });


    //--------------------------------------------------
    // Composition Root
    //--------------------------------------------------

    return {

        router,

        controller:
            taxController,

        service:
            taxService,

        repository:
            taxRepository,

        useCases: {

            calculateTaxUseCase,

            recordTaxUseCase,

            payTaxUseCase,

            getTaxUseCase,

            listTaxesUseCase,

        },

    };

}