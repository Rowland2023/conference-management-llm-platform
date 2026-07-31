// src/bootstrap/lifecycle.js

export function bootstrapLifecycle({
    infrastructure,
    modules,
    logger,
}) {

    const {
        kafkaConnection,
        eventBus,
        outboxWorker,
    } = infrastructure;

    async function invoke(
        target,
        method,
        message,
        ...args
    ) {

        if (
            target &&
            typeof target[method] === "function"
        ) {

            await target[method](...args);

            if (message) {
                logger.info(message);
            }

        }

    }

    async function start() {

        logger.info(
            "Starting application lifecycle..."
        );

        //
        // Infrastructure
        //

        await invoke(
            kafkaConnection,
            "initialize",
            "Kafka connection initialized."
        );

        await invoke(
            eventBus,
            "initialize",
            "Event bus initialized."
        );

        await invoke(
            eventBus,
            "startConsuming",
            "Event consumers started."
        );

        //
        // IMPORTANT:
        // Only the application lifecycle starts
        // the shared Transactional Outbox worker.
        //

        await invoke(
            outboxWorker,
            "start",
            "Outbox worker started."
        );

        //
        // Modules
        //

        for (const module of modules) {

            await invoke(
                module,
                "start"
            );

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

        for (const module of [...modules].reverse()) {

            await invoke(
                module,
                "stop",
                null,
                eventBus
            );

        }

        //
        // Infrastructure
        //

        await invoke(
            outboxWorker,
            "stop",
            "Outbox worker stopped."
        );

        await invoke(
            eventBus,
            "shutdown",
            "Event bus stopped."
        );

        await invoke(
            kafkaConnection,
            "shutdown",
            "Kafka connection closed."
        );

        logger.info(
            "Application stopped successfully."
        );

    }

    return {
        start,
        stop,
    };

}