/**
 * @file src/shared/infrastructure/messaging/outbox/OutboxWorker.js
 * @description Transactional Outbox background worker.
 */

export class OutboxWorker {

    /**
     * @param {Object} params
     * @param {PostgresOutboxRepository} params.outboxRepository
     * @param {KafkaEventBus} params.eventBus
     * @param {Object} [params.logger]
     * @param {number} [params.pollIntervalMs]
     * @param {number} [params.batchSize]
     * @param {number} [params.maxRetries]
     */
    constructor({
        outboxRepository,
        eventBus,
        logger = console,
        pollIntervalMs = 3000,
        batchSize = 100,
        maxRetries = 5,
    }) {

        if (!outboxRepository) {
            throw new Error(
                "OutboxWorker requires an outboxRepository."
            );
        }

        if (!eventBus) {
            throw new Error(
                "OutboxWorker requires an eventBus."
            );
        }

        this.outboxRepository = outboxRepository;
        this.eventBus = eventBus;

        this.logger = logger;

        this.pollIntervalMs = pollIntervalMs;
        this.batchSize = batchSize;
        this.maxRetries = maxRetries;

        this.running = false;
        this.timer = null;
    }

    /**
     * Starts the polling loop.
     */
    start() {

        if (this.running) {
            return;
        }

        this.running = true;

        this.logger.info?.(
            "[OutboxWorker] Started."
        );

        this.#schedule();

    }

    /**
     * Stops the worker.
     */
    async stop() {

        this.running = false;

        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        this.logger.info?.(
            "[OutboxWorker] Stopped."
        );

    }

    /**
     * Internal polling loop.
     */
    async #schedule() {

        if (!this.running) {
            return;
        }

        try {

            await this.#processBatch();

        } catch (error) {

            this.logger.error?.(
                "[OutboxWorker] Batch processing failed.",
                error
            );

        } finally {

            if (this.running) {

                this.timer = setTimeout(
                    () => this.#schedule(),
                    this.pollIntervalMs
                );

            }

        }

    }

    /**
     * Processes a batch of pending events.
     */
    async #processBatch() {

        const events =
            await this.outboxRepository.fetchAndLockPending(
                this.batchSize,
                this.maxRetries
            );

        if (events.length === 0) {
            return;
        }

        this.logger.info?.(
            `[OutboxWorker] Processing ${events.length} event(s).`
        );

        for (const event of events) {

            await this.#publish(event);

        }

    }

    /**
     * Publishes a single event.
     */
    async #publish(event) {

        try {

            const payload =
                typeof event.payload === "string"
                    ? JSON.parse(event.payload)
                    : event.payload;

            await this.eventBus.publish(
                event.event_name,
                payload
            );

            await this.outboxRepository.markAsDispatched(
                event.id
            );

            this.logger.info?.(
                `[OutboxWorker] Published ${event.event_name}.`
            );

        } catch (error) {

            this.logger.error?.(
                `[OutboxWorker] Failed publishing ${event.event_name}.`,
                error
            );

            await this.outboxRepository.incrementRetry(
                event.id,
                error.message
            );

        }

    }

}