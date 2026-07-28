/**
 * @file src/Shared/infrastructure/messaging/KafkaEventBus.js
 * @description Event Bus facade powering domain event publishing and event subscriptions.
 */

import {KafkaProducer} from './KafkaProducer.js';
import {KafkaConsumer} from './KafkaConsumer.js';
import RequestContext from '../../../../cross-cutting/context/request-context.js';

export class KafkaEventBus {
  /**
   * @param {Object} params
   * @param {Object} params.kafkaConnection - Initialized KafkaConnection instance
   * @param {string} params.groupId - Consumer group ID
   * @param {Object} [params.logger] - Application logger facade
   */
  constructor({ kafkaConnection, groupId, logger }) {
    if (!kafkaConnection) {
      throw new Error(
        'KafkaEventBus requires a valid KafkaConnection instance.'
      );
    }

    if (!groupId) {
      throw new Error(
        'KafkaEventBus requires a consumer groupId.'
      );
    }

    const kafka = kafkaConnection.getKafkaInstance();

    this.logger = logger;

    this.producer = new KafkaProducer({
      kafka,
      logger,
    });

    this.consumer = new KafkaConsumer({
      kafka,
      groupId,
      logger,
    });

    this.handlersMap = new Map();
  }


  /**
   * Connect producer
   */
  async initialize() {
    await this.producer.connect();
  }


  /**
   * Publish domain event
   */
  async publish(topic, event) {
    const rawKey = event.aggregateId || event.id || null;

    const partitionKey = rawKey
      ? String(rawKey)
      : null;

    const correlationId =
      RequestContext.getCorrelationId();

    const tenantId =
      RequestContext.getTenantId();


    const message = {
      key: partitionKey,

      value: {
        eventId: event.id || event.eventId,

        eventType: topic,

        occurredOn:
          event.occurredOn ||
          new Date().toISOString(),

        payload:
          event.payload ||
          event,
      },

      headers: {
        ...(correlationId && {
          'x-correlation-id': correlationId,
        }),

        ...(tenantId && {
          'x-tenant-id': tenantId,
        }),
      },
    };


    await this.producer.publish(topic, [
      message,
    ]);
  }


  /**
   * Register event subscriber
   */
  subscribe(topic, handler) {
    if (!this.handlersMap.has(topic)) {
      this.handlersMap.set(topic, []);
    }

    this.handlersMap
      .get(topic)
      .push(handler);
  }


  /**
   * Start Kafka consumers
   */
  async startConsuming() {

    const topics =
      Array.from(this.handlersMap.keys());


    if (topics.length === 0) {

      this.logger?.warn(
        'KafkaEventBus started without registered handlers.'
      );

      return;
    }


    await this.consumer.subscribe(topics);


    await this.consumer.start(
      async ({ topic, payload, headers }) => {


        const correlationId =
          headers?.['x-correlation-id'] ||
          headers?.['x-request-id'] ||
          payload?.eventId;


        const tenantId =
          headers?.['x-tenant-id'];



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

                this.logger?.error(
                  'Kafka event handler failed',
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
   * Shutdown Kafka resources
   */
  async shutdown() {

    await Promise.allSettled([
      this.producer.disconnect(),
      this.consumer.disconnect(),
    ]);

  }
}