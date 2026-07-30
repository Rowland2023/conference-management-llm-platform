// KafkaProducer.js

import { CompressionTypes } from "kafkajs";

export class KafkaProducer {

    constructor({
        kafka,
        logger = console,
        config = {},
    }) {

        if (!kafka) {
            throw new Error("KafkaProducer requires kafka instance.");
        }

        this.logger = logger;

        this.producer = kafka.producer({

            idempotent: true,

            maxInFlightRequests: 1,

            allowAutoTopicCreation: false,

            transactionTimeout: 30000,

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

        this.registerInstrumentationEvents();

        this.logger.info?.("Kafka producer connected.");
    }

    registerInstrumentationEvents() {

        const { DISCONNECT, CRASH } =
            this.producer.events;

        this.producer.off(DISCONNECT, this.handleDisconnect);
        this.producer.off(CRASH, this.handleCrash);

        this.producer.on(DISCONNECT, this.handleDisconnect);
        this.producer.on(CRASH, this.handleCrash);
    }

    handleDisconnect() {

        this.logger.warn?.(
            "Kafka producer disconnected."
        );

    }

    async handleCrash(event) {

        this.logger.error?.(
            "Kafka producer crashed.",
            event.payload.error
        );

        this.isInitialized = false;

        if (this.isReconnecting) {
            return;
        }

        this.isReconnecting = true;

        try {

            await this.producer.disconnect();

        } catch {}

        clearTimeout(this.reconnectTimeoutRef);

        this.reconnectTimeoutRef =
            setTimeout(async () => {

                try {

                    await this.connect();

                    this.isReconnecting = false;

                } catch (err) {

                    this.logger.error?.(err);

                }

            }, 5000);
    }

    async publish(topic, messages) {

        if (!this.isInitialized) {
            throw new Error(
                "KafkaProducer not connected."
            );
        }

        await this.producer.send({

            topic,

            compression: CompressionTypes.GZIP,

            messages: messages.map(message => ({

                key: message.key,

                value:
                    typeof message.value === "string"
                        ? message.value
                        : JSON.stringify(message.value),

                headers: message.headers,

            })),

        });
    }

    async disconnect() {

        clearTimeout(this.reconnectTimeoutRef);

        if (!this.isInitialized) {
            return;
        }

        await this.producer.disconnect();

        this.isInitialized = false;
    }

}