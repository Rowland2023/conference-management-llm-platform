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
                "KafkaProducer requires Kafka instance."
            );
        }

        this.logger = logger;

        this.kafka = kafka;

        this.instrumentationEmitter =
            kafka.instrumentationEmitter;

        this.producer =
            kafka.producer({

                allowAutoTopicCreation: false,

                idempotent: true,

                maxInFlightRequests: 1,

                createPartitioner:
                    Partitioners.LegacyPartitioner,

                transactionTimeout: 30000,

                ...config,

            });

        this.connected = false;

        this.reconnecting = false;

    }

    async connect() {

        if (this.connected) {
            return;
        }

        await this.producer.connect();

        this.connected = true;

        this.registerEvents();

        this.logger.info(
            "Kafka producer connected."
        );

    }

    registerEvents() {

        if (!this.instrumentationEmitter) {
            return;
        }

        this.instrumentationEmitter.on(
            "producer.disconnect",
            () => {

                this.connected = false;

                this.logger.warn(
                    "Kafka producer disconnected."
                );

            }
        );

        this.instrumentationEmitter.on(
            "producer.crash",
            async ({ payload }) => {

                this.logger.error(
                    payload.error,
                    "Kafka producer crashed."
                );

                this.connected = false;

                this.reconnect();

            }
        );

    }

    async reconnect() {

        if (this.reconnecting) {
            return;
        }

        this.reconnecting = true;

        while (!this.connected) {

            try {

                await this.producer.connect();

                this.connected = true;

                this.logger.info(
                    "Kafka producer recovered."
                );

            } catch {

                await new Promise(
                    (resolve) =>
                        setTimeout(resolve, 5000)
                );

            }

        }

        this.reconnecting = false;

    }

    async publish(
        topic,
        messages,
    ) {

        if (!this.connected) {

            throw new Error(
                "Kafka producer is not connected."
            );

        }

        await this.producer.send({

            topic,

            compression:
                CompressionTypes.GZIP,

            messages:
                messages.map((m) => ({

                    key:
                        m.key?.toString(),

                    value:
                        typeof m.value === "string"
                            ? m.value
                            : JSON.stringify(m.value),

                    headers:
                        m.headers,

                })),

        });

    }

    async disconnect() {

        if (!this.connected) {
            return;
        }

        await this.producer.disconnect();

        this.connected = false;

        this.logger.info(
            "Kafka producer disconnected."
        );

    }

}