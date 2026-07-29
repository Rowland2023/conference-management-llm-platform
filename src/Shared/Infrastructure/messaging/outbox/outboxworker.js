/**
 * @file src/shared/infrastructure/messaging/outbox/OutboxWorker.js
 *
 * Transactional Outbox Worker
 *
 * Responsibilities
 * ----------------
 * - Poll unpublished outbox events.
 * - Dispatch events through OutboxDispatcher.
 * - Mark successful events.
 * - Retry failed events.
 * - Run continuously until stopped.
 */

export class OutboxWorker {

    constructor({

        outboxRepository,

        dispatcher,

        logger = console,

        pollIntervalMs = 3000,

        batchSize = 100,

        maxRetries = 5,

    }) {

        if (!outboxRepository) {

            throw new Error(
                "OutboxWorker requires outboxRepository."
            );

        }

        if (!dispatcher) {

            throw new Error(
                "OutboxWorker requires dispatcher."
            );

        }

        this.outboxRepository =
            outboxRepository;

        this.dispatcher =
            dispatcher;

        this.logger =
            logger;

        this.pollIntervalMs =
            pollIntervalMs;

        this.batchSize =
            batchSize;

        this.maxRetries =
            maxRetries;

        this.running = false;

        this.processing = false;

        this.timer = null;

    }

    /* ------------------------------------------------------ */
    /* Public API                                              */
    /* ------------------------------------------------------ */

    async start() {

        if (this.running) {

            return;

        }

        this.running = true;

        this.logger.info?.(
            "OutboxWorker started."
        );

        this.#schedule();

    }

    async stop() {

        this.running = false;

        if (this.timer) {

            clearTimeout(this.timer);

            this.timer = null;

        }

        while (this.processing) {

            await new Promise(resolve =>
                setTimeout(resolve, 100)
            );

        }

        this.logger.info?.(
            "OutboxWorker stopped."
        );

    }

    /* ------------------------------------------------------ */
    /* Scheduler                                               */
    /* ------------------------------------------------------ */

    #schedule() {

        if (!this.running) {

            return;

        }

        this.timer = setTimeout(

            async () => {

                try {

                    await this.#poll();

                }

                finally {

                    if (this.running) {

                        this.#schedule();

                    }

                }

            },

            this.pollIntervalMs

        );

    }

    /* ------------------------------------------------------ */
    /* Poll                                                    */
    /* ------------------------------------------------------ */

    async #poll() {

        if (this.processing) {

            return;

        }

        this.processing = true;

        try {

            const events =
                await this.outboxRepository
                    .fetchAndLockPending(

                        this.batchSize,

                        this.maxRetries

                    );

            if (!events.length) {

                return;

            }

            this.logger.info?.(

                {

                    count: events.length,

                },

                "Processing outbox batch."

            );

            for (const event of events) {

                await this.#dispatch(event);

            }

        }

        catch (error) {

            this.logger.error?.(

                {

                    error,

                },

                "OutboxWorker polling failed."

            );

        }

        finally {

            this.processing = false;

        }

    }

    /* ------------------------------------------------------ */
    /* Dispatch                                                */
    /* ------------------------------------------------------ */

    async #dispatch(event) {

        try {

            await this.dispatcher.dispatch(event);

            await this.outboxRepository
                .markAsDispatched(
                    event.id
                );

            this.logger.debug?.(

                {

                    eventId:
                        event.id,

                    eventName:
                        event.eventName,

                },

                "Outbox event dispatched."

            );

        }

        catch (error) {

            this.logger.error?.(

                {

                    eventId:
                        event.id,

                    eventName:
                        event.eventName,

                    error,

                },

                "Outbox dispatch failed."

            );

            await this.outboxRepository
                .incrementRetry(

                    event.id,

                    error.message

                );

        }

    }

}