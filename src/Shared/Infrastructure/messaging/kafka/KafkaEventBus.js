/**
 * @file src/shared/infrastructure/messaging/kafka/KafkaEventBus.js
 * @description Event Bus facade powering domain event publishing and event subscriptions.
 */

import { KafkaProducer } from "./KafkaProducer.js";
import { KafkaConsumer } from "./KafkaConsumer.js";
import RequestContext from "../../../../cross-cutting/context/request-context.js";

export class KafkaEventBus {

  /**
   * @param {Object} params
   * @param {KafkaConnection} params.kafkaConnection
   * @param {string} params.groupId
   * @param {Object} [params.logger]
   */
  constructor(params = {}) {

    const {
      kafkaConnection,
      groupId,
      logger = console,
    } = params;


    if (!kafkaConnection) {
      throw new Error(
        "KafkaEventBus requires a valid KafkaConnection instance."
      );
    }


    if (typeof kafkaConnection.getKafkaInstance !== "function") {
      throw new Error(
        "KafkaConnection must expose getKafkaInstance()."
      );
    }


    if (!groupId || typeof groupId !== "string") {
      throw new Error(
        "KafkaEventBus requires a valid consumer groupId."
      );
    }


    const kafka =
      kafkaConnection.getKafkaInstance();


    if (!kafka) {
      throw new Error(
        "KafkaConnection returned an invalid Kafka instance."
      );
    }


    this.kafkaConnection = kafkaConnection;
    this.kafka = kafka;
    this.groupId = groupId;
    this.logger = logger;

    this.handlersMap = new Map();

    this.producer =
      new KafkaProducer({

        kafka,

        logger,

      });

    this.consumer =
      new KafkaConsumer({

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
   * Publish event.
   */
  async publish(topic, event) {

    if (!topic) {
      throw new Error(
        "Topic is required."
      );
    }


    if (!event) {
      throw new Error(
        "Event is required."
      );
    }


    const correlationId =
      RequestContext.getCorrelationId?.();

    const tenantId =
      RequestContext.getTenantId?.();


    const partitionKey =
      event.aggregateId
        ? String(event.aggregateId)
        : event.id
          ? String(event.id)
          : null;


    const message = {

      key:
        partitionKey,

      value: {

        eventId:
          event.eventId ||
          event.id,

        eventType:
          topic,

        occurredOn:
          event.occurredOn ||
          new Date().toISOString(),

        payload:
          event.payload || event,

      },

      headers: {

        ...(correlationId && {
          "x-correlation-id":
            correlationId,
        }),

        ...(tenantId && {
          "x-tenant-id":
            tenantId,
        }),

      },

    };


    await this.producer.publish(

      topic,

      [message]

    );

  }

  /**
   * Register subscriber.
   */
  subscribe({
    topic,
    eventType,
    handler,
}){

    if (!topic) {
      throw new Error(
        "Topic is required."
      );
    }


    if (typeof handler !== "function") {
      throw new Error(
        "Subscriber must be a function."
      );
    }


    if (!this.handlersMap.has(topic)) {

      this.handlersMap.set(

        topic,

        []

      );

    }


    this.handlersMap
      .get(topic)
      .push(handler);

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

    const filtered =
      handlers.filter(
        h => h !== handler
      );

    if (filtered.length === 0) {

      this.handlersMap.delete(topic);

      return;
    }

    this.handlersMap.set(
      topic,
      filtered
    );

  }






  /**
   * Begin consuming.
   */
  async startConsuming() {

    const topics =
      [...this.handlersMap.keys()];


    if (topics.length === 0) {

      this.logger.warn?.(
        "KafkaEventBus started with no subscriptions."
      );

      return;

    }


    await this.consumer.subscribe(
      topics
    );


    await this.consumer.start(

      async ({ topic, payload, headers }) => {

        const correlationId =
          headers?.["x-correlation-id"] ||
          headers?.["x-request-id"] ||
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

            const handlers =
              this.handlersMap.get(topic) || [];


            for (const handler of handlers) {

              try {

                await handler(
                  payload,
                  headers
                );

              } catch (error) {

                this.logger.error?.(

                  "Kafka event handler failed",

                  {
                    topic,
                    eventId: payload?.eventId,
                    error,
                  }

                );

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