// tax/index.js

import { createTaxContainer }
    from "./container.js";


export function createTaxModule(shared) {

    const {

        logger,

    } = shared;


    const container =
        createTaxContainer(shared);


    return {

        //--------------------------------------------------
        // Module Metadata
        //--------------------------------------------------

        name:
            "tax",

        router:
            container.router,

        controller:
            container.controller,

        service:
            container.service,

        repository:
            container.repository,

        useCases:
            container.useCases,


        //--------------------------------------------------
        // Lifecycle
        //--------------------------------------------------

        subscribe() {

            // Subscribe to events when Tax needs them.
            //
            // Examples:
            //
            // payment.completed
            // invoice.issued
            // settlement.completed

        },


        async start() {

            logger.info(

                "Tax module started."

            );

        },


        async stop() {

            logger.info(

                "Tax module stopped."

            );

        },

    };

}