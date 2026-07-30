// bootstrap/lifecycle.js

export function bootstrapLifecycle({
    eventBus,
    outboxWorker,
    modules,
    logger,
}) {

    async function start() {

        await eventBus.initialize();

        await eventBus.startConsuming();

        await outboxWorker.start();

        for (const module of modules) {
            await module.start?.();
        }

        logger.info("Application started.");
    }

    async function stop() {

        for (const module of [...modules].reverse()) {
            await module.stop?.();
        }

        await outboxWorker.stop();

        await eventBus.shutdown();

        logger.info("Application stopped.");
    }

    return {
        start,
        stop,
    };
}