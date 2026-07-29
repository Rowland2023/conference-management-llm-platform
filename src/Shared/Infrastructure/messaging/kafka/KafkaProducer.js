// src/shared/infrastructure/messaging/kafka/KafkaProducer.js

import {
  CompressionTypes,
  Partitioners,
} from "kafkajs";

export class KafkaProducer {
  /**
   * @param {Object} deps
   * @param {import("kafkajs").Kafka} deps.kafka
   * @param {Object} [deps.logger]
   * @param {Object} [deps.config]
   */
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
    this.connected = false;

    this.producer = kafka.producer({
      idempotent: true,

      // Required for exactly-once semantics
      maxInFlightRequests: 1,

      allowAutoTopicCreation: false,

      transactionTimeout: 30000,

      // Silence KafkaJS partition warning
      createPartitioner:
        Partitioners.LegacyPartitioner,

      ...config,
    });

    this.registerEvents();
  }

  registerEvents() {
    const events = this.producer.events;

    this.producer.on(events.CONNECT, () => {
      this.connected = true;

      this.logger.info?.(
        "[KafkaProducer] Connected."
      );
    });

    this.producer.on(events.DISCONNECT, () => {
      this.connected = false;

      this.logger.warn?.(
        "[KafkaProducer] Disconnected."
      );
    });

    this.producer.on(events.REQUEST, ({ payload }) => {
      this.logger.debug?.(
        "[KafkaProducer] Request",
        {
          apiKey: payload.apiKey,
          broker: payload.broker,
          correlationId: payload.correlationId,
        }
      );
    });

    this.producer.on(
      events.REQUEST_TIMEOUT,
      ({ payload }) => {
        this.logger.warn?.(
          "[KafkaProducer] Request timeout",
          {
            broker: payload.broker,
            correlationId:
              payload.correlationId,
          }
        );
      }
    );

    this.producer.on(
      events.REQUEST_QUEUE_SIZE,
      ({ payload }) => {
        this.logger.debug?.(
          "[KafkaProducer] Queue size",
          {
            queueSize: payload.queueSize,
          }
        );
      }
    );
  }

  async connect() {
    if (this.connected) {
      return;
    }

    this.logger.info?.(
      "[KafkaProducer] Connecting..."
    );

    await this.producer.connect();

    this.connected = true;

    this.logger.info?.(
      "[KafkaProducer] Ready."
    );
  }

  async publish(topic, messages) {
    if (!this.connected) {
      throw new Error(
        "KafkaProducer is not connected."
      );
    }

    if (!topic) {
      throw new Error(
        "publish() requires a topic."
      );
    }

    if (!Array.isArray(messages)) {
      throw new Error(
        "publish() expects an array of messages."
      );
    }

    const normalizedMessages = messages.map(
      (message) => ({
        key:
          message.key != null
            ? String(message.key)
            : undefined,

        value:
          typeof message.value === "string"
            ? message.value
            : JSON.stringify(message.value),

        headers:
          message.headers || {},
      })
    );

    await this.producer.send({
      topic,
      compression:
        CompressionTypes.GZIP,
      messages: normalizedMessages,
    });
  }

  async send(topic, payload, key) {
    await this.publish(topic, [
      {
        key,
        value: payload,
        headers: {
          producedAt:
            new Date().toISOString(),
        },
      },
    ]);
  }

  async disconnect() {
    if (!this.connected) {
      return;
    }

    this.logger.info?.(
      "[KafkaProducer] Disconnecting..."
    );

    await this.producer.disconnect();

    this.connected = false;

    this.logger.info?.(
      "[KafkaProducer] Disconnected."
    );
  }

  isConnected() {
    return this.connected;
  }
}