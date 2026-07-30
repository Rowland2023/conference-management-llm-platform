 // src/bootstrap/lifecycle.js

export function bootstrapLifecycle({
    infrastructure,
    modules,
    logger,
}) {

    const {
        eventBus,
        kafkaConnection,
        outboxWorker,
    } = infrastructure;


    async function start() {

        logger.info(
            "Starting application lifecycle..."
        );


        //
        // Infrastructure startup
        //

        if (
            kafkaConnection &&
            typeof kafkaConnection.initialize === "function"
        ) {

            await kafkaConnection.initialize();

            logger.info(
                "Kafka connection initialized."
            );
        }


        if (
            eventBus &&
            typeof eventBus.initialize === "function"
        ) {

            await eventBus.initialize();

            logger.info(
                "Event bus initialized."
            );
        }


        if (
            eventBus &&
            typeof eventBus.startConsuming === "function"
        ) {

            await eventBus.startConsuming();

            logger.info(
                "Event consumers started."
            );
        }


        if (
            outboxWorker &&
            typeof outboxWorker.start === "function"
        ) {

            await outboxWorker.start();

            logger.info(
                "Outbox worker started."
            );
        }


        //
        // Domain modules startup
        //

        for (const module of modules) {

            if (
                module &&
                typeof module.start === "function"
            ) {

                await module.start();

            }

        }


        logger.info(
            "Application started successfully."
        );
    }



    async function stop() {

        logger.info(
            "Stopping application lifecycle..."
        );


        //
        // Stop modules first
        //

        for (
            const module of [...modules].reverse()
        ) {

            if (
                module &&
                typeof module.stop === "function"
            ) {

                await module.stop(eventBus);

            }

        }


        //
        // Stop background workers
        //

        if (
            outboxWorker &&
            typeof outboxWorker.stop === "function"
        ) {

            await outboxWorker.stop();

        }


        //
        // Stop messaging infrastructure
        //

        if (
            eventBus &&
            typeof eventBus.shutdown === "function"
        ) {

            await eventBus.shutdown();

        }


        if (
            kafkaConnection &&
            typeof kafkaConnection.shutdown === "function"
        ) {

            await kafkaConnection.shutdown();

        }


        logger.info(
            "Application stopped successfully."
        );

    }


    return {
        start,
        stop,
    };
}