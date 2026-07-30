/**
 * @file src/shared/infrastructure/messaging/kafka/KafkaEventBus.js
 * @description Kafka-backed Event Bus for publishing and subscribing to domain events.
 */

import { KafkaProducer } from "./KafkaProducer.js";
import { KafkaConsumer } from "./KafkaConsumer.js";
import RequestContext from "../../../../cross-cutting/context/request-context.js";

export class KafkaEventBus {
  constructor(params = {}) {
    const {
      kafkaConnection,
      groupId,
      logger = console,
    } = params;

    if (!kafkaConnection) {
      throw new Error(
        "KafkaEventBus requires 'kafkaConnection'."
      );
    }

    if (typeof kafkaConnection.getKafkaInstance !== "function") {
      throw new Error(
        "KafkaConnection must expose getKafkaInstance()."
      );
    }

    if (!groupId || typeof groupId !== "string") {
      throw new Error(
        "KafkaEventBus requires a valid 'groupId'."
      );
    }

    const kafka = kafkaConnection.getKafkaInstance();

    if (!kafka) {
      throw new Error(
        "KafkaConnection returned an invalid Kafka instance."
      );
    }

    this.logger = logger;
    this.handlersMap = new Map();

    this.producer = new KafkaProducer({
      kafka,
      logger,
    });

    this.consumer = new KafkaConsumer({
      kafka,
      groupId,
      logger,
    });
  }

  /**
   * Connect producer.
   */
  async initialize() {
    await this.producer.connect();
  }

  /**
   * Publish domain event.
   */
  async publish(topic, event) {
    if (!topic) {
      throw new Error("Topic is required.");
    }

    if (!event) {
      throw new Error("Event is required.");
    }

    const correlationId =
      RequestContext.getCorrelationId?.();

    const tenantId =
      RequestContext.getTenantId?.();

    const partitionKey =
      event.aggregateId != null
        ? String(event.aggregateId)
        : event.id != null
          ? String(event.id)
          : null;

    await this.producer.publish(topic, [
      {
        key: partitionKey,

        value: {
          eventId: event.eventId ?? event.id,
          eventType: topic,
          occurredOn:
            event.occurredOn ??
            new Date().toISOString(),
          payload:
            event.payload ?? event,
        },

        headers: {
          ...(correlationId && {
            "x-correlation-id": correlationId,
          }),

          ...(tenantId && {
            "x-tenant-id": tenantId,
          }),
        },
      },
    ]);
  }

  /**
   * Register subscriber.
   */
  subscribe(topic, handler) {
    if (!topic || typeof topic !== "string") {
      throw new Error(
        "subscribe() requires a valid topic."
      );
    }

    if (typeof handler !== "function") {
      throw new Error(
        "subscribe() requires a handler function."
      );
    }

    const handlers =
      this.handlersMap.get(topic) ?? [];

    handlers.push(handler);

    this.handlersMap.set(
      topic,
      handlers
    );

    // Return unsubscribe token
    return handler;
  }

  /**
   * Remove subscriber.
   */
  unsubscribe(topic, handler) {
    const handlers =
      this.handlersMap.get(topic);

    if (!handlers) {
      return;
    }

    const remaining =
      handlers.filter(
        h => h !== handler
      );

    if (remaining.length === 0) {
      this.handlersMap.delete(topic);
      return;
    }

    this.handlersMap.set(
      topic,
      remaining
    );
  }

  /**
   * Start consuming all subscribed topics.
   */
  async startConsuming() {
    const topics = [
      ...this.handlersMap.keys(),
    ];

    if (topics.length === 0) {
      this.logger.warn?.(
        "KafkaEventBus started with no subscriptions."
      );
      return;
    }

    this.logger.info?.({
      message:
        "Starting Kafka consumers.",
      topics,
    });

    await this.consumer.subscribe(
      topics
    );

    await this.consumer.start(
      async ({
        topic,
        payload,
        headers,
      }) => {
        const handlers =
          this.handlersMap.get(topic) ??
          [];

        const correlationId =
          headers?.["x-correlation-id"] ??
          headers?.["x-request-id"] ??
          payload?.eventId;

        const tenantId =
          headers?.["x-tenant-id"];

        await RequestContext.run(
          {
            correlationId,
            tenantId,
            source: `kafka:${topic}`,
          },

          async () => {
            for (const handler of handlers) {
              try {
                await handler(
                  payload,
                  headers
                );
              } catch (error) {
                this.logger.error?.({
                  message:
                    "Kafka handler failed.",
                  topic,
                  eventId:
                    payload?.eventId,
                  error,
                });

                throw error;
              }
            }
          }
        );
      }
    );
  }

  /**
   * Shutdown.
   */
  async shutdown() {
    await Promise.allSettled([
      this.producer.disconnect(),
      this.consumer.disconnect(),
    ]);
  }
}