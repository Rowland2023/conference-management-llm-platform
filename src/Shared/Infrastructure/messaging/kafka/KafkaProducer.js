// src/shared/infrastructure/messaging/kafka/KafkaProducer.js

import {
    CompressionTypes,
    Partitioners,
} from "kafkajs";

export class KafkaProducer {

    constructor({
        kafka,
        logger = console,
        config = {},
    }) {

        if (!kafka) {
            throw new Error(
                "KafkaProducer requires a Kafka instance."
            );
        }

        this.logger = logger;

        this.instrumentationEmitter =
            kafka.instrumentationEmitter;

        this.producer =
            kafka.producer({

                idempotent: true,

                maxInFlightRequests: 1,

                allowAutoTopicCreation: false,

                transactionTimeout: 30000,

                createPartitioner:
                    Partitioners.LegacyPartitioner,

                ...config,

            });

        this.isInitialized = false;

        this.isReconnecting = false;

        this.reconnectTimeoutRef = null;

        this.handleDisconnect =
            this.handleDisconnect.bind(this);

        this.handleCrash =
            this.handleCrash.bind(this);

    }

    async connect() {

        if (this.isInitialized) {
            return;
        }

        await this.producer.connect();

        this.isInitialized = true;

        this.isReconnecting = false;

        this.registerInstrumentationEvents();

        this.logger.info?.(
            "Kafka producer connected."
        );

    }

    registerInstrumentationEvents() {

        if (!this.instrumentationEmitter) {
            return;
        }

        this.instrumentationEmitter.on(
            "producer.disconnect",
            this.handleDisconnect,
        );

        this.instrumentationEmitter.on(
            "producer.crash",
            this.handleCrash,
        );

    }

    handleDisconnect(event) {

        this.logger.warn?.(
            { event },
            "Kafka producer disconnected."
        );

    }

    async handleCrash(event) {

        const error =
            event?.payload?.error;

        this.logger.error?.(
            { error },
            "Kafka producer crashed."
        );

        this.isInitialized = false;

        if (this.isReconnecting) {
            return;
        }

        this.isReconnecting = true;

        try {

            await this.producer.disconnect();

        } catch (err) {

            this.logger.warn?.(
                { err },
                "Kafka producer disconnect failed during recovery."
            );

        }

        clearTimeout(
            this.reconnectTimeoutRef
        );

        this.reconnectTimeoutRef =
            setTimeout(async () => {

                try {

                    await this.connect();

                    this.logger.info?.(
                        "Kafka producer recovered."
                    );

                } catch (err) {

                    this.logger.error?.(
                        { err },
                        "Kafka producer recovery failed."
                    );

                } finally {

                    this.isReconnecting = false;

                }

            }, 5000);

    }

    async publish(
        topic,
        messages,
    ) {

        if (!this.isInitialized) {

            throw new Error(
                "KafkaProducer not connected."
            );

        }

        if (!topic) {

            throw new Error(
                "KafkaProducer.publish requires a topic."
            );

        }

        if (
            !Array.isArray(messages) ||
            messages.length === 0
        ) {

            throw new Error(
                "KafkaProducer.publish requires at least one message."
            );

        }

        await this.producer.send({

            topic,

            compression:
                CompressionTypes.GZIP,

            messages:
                messages.map((message) => ({

                    key:
                        message.key != null
                            ? String(message.key)
                            : undefined,

                    value:
                        typeof message.value === "string"
                            ? message.value
                            : JSON.stringify(message.value),

                    headers:
                        message.headers,

                })),

        });

    }

    async disconnect() {

        clearTimeout(
            this.reconnectTimeoutRef
        );

        this.reconnectTimeoutRef = null;

        this.isReconnecting = false;

        if (!this.isInitialized) {
            return;
        }

        await this.producer.disconnect();

        this.isInitialized = false;

        this.logger.info?.(
            "Kafka producer disconnected."
        );

    }

}