/**
 * @file src/Shared/infrastructure/messaging/KafkaEventBus.js
 * @description Event Bus facade powering domain event publishing and event subscriptions.
 */
const KafkaProducer = require('./KafkaProducer');
const KafkaConsumer = require('./KafkaConsumer');
const RequestContext = require('../../../cross-cutting/request-context');

class KafkaEventBus {
  /**
   * @param {Object} params
   * @param {import('./KafkaConnection')} params.kafkaConnection - Initialized KafkaConnection instance
   * @param {string} params.groupId - Consumer group ID for this module/service instance
   * @param {Object} [params.logger] - Application Logger facade
   */
  constructor({ kafkaConnection, groupId, logger }) {
    if (!kafkaConnection) {
      throw new Error('KafkaEventBus requires a valid KafkaConnection instance.');
    }
    if (!groupId) {
      throw new Error('KafkaEventBus requires a consumer groupId.');
    }

    const kafka = kafkaConnection.getKafkaInstance();
    this.logger = logger;

    this.producer = new KafkaProducer({ kafka, logger });
    this.consumer = new KafkaConsumer({ kafka, groupId, logger });
    this.handlersMap = new Map(); // Topic -> Array<handlerFn>
  }

  /**
   * Connects the underlying producer to the broker.
   */
  async initialize() {
    await this.producer.connect();
  }

  /**
   * Publishes a domain event to a target topic.
   * Auto-injects current correlation ID into Kafka headers.
   *
   * @param {string} topic - Target event topic (e.g. 'ledger.journal-entry.posted')
   * @param {Object} event - Domain event object
   * @param {string} [event.aggregateId] - Key for partition routing
   * @param {Object} event.payload - Main domain payload
   * @returns {Promise<void>}
   */
  async publish(topic, event) {
    const rawKey = event.aggregateId || event.id || null;
    const partitionKey = rawKey ? String(rawKey) : null;
    const correlationId = RequestContext.getCorrelationId();

    const message = {
      key: partitionKey,
      value: {
        eventId: event.id || event.eventId,
        eventType: topic,
        occurredOn: event.occurredOn || new Date().toISOString(),
        payload: event.payload || event,
      },
      headers: {
        ...(correlationId && { 'x-correlation-id': correlationId }),
        ...(RequestContext.getTenantId() && { 'x-tenant-id': RequestContext.getTenantId() }),
      },
    };

    await this.producer.publish(topic, [message]);
  }

  /**
   * Registers an async handler for a given event topic.
   *
   * @param {string} topic - Topic name to subscribe to
   * @param {Function} handler - Async handler function `async (payload, headers)`
   */
  subscribe(topic, handler) {
    if (!this.handlersMap.has(topic)) {
      this.handlersMap.set(topic, []);
    }
    this.handlersMap.get(topic).push(handler);
  }

  /**
   * Starts consuming subscribed topics and dispatches incoming messages safely.
   * Restores AsyncLocalStorage context and isolates handler errors to prevent consumer stalls.
   */
  async startConsuming() {
    const topics = Array.from(this.handlersMap.keys());
    if (topics.length === 0) {
      if (this.logger) {
        this.logger.warn('KafkaEventBus startConsuming() invoked, but no handlers were registered.');
      }
      return;
    }

    await this.consumer.subscribe(topics);

    await this.consumer.start(async ({ topic, payload, headers }) => {
      // 1. Extract context headers from incoming Kafka record
      const correlationId =
        headers?.['x-correlation-id'] ||
        headers?.['x-request-id'] ||
        payload?.eventId;

      const tenantId = headers?.['x-tenant-id'];

      // 2. Wrap consumption execution in RequestContext tree
      await RequestContext.run(
        {
          correlationId,
          tenantId,
          source: `kafka:${topic}`,
        },
        async () => {
          const handlers = this.handlersMap.get(topic) || [];

          for (const handler of handlers) {
            try {
              await handler(payload, headers);
            } catch (handlerError) {
              if (this.logger) {
                this.logger.error('Error executing Kafka event handler', {
                  topic,
                  eventId: payload?.eventId,
                  error: handlerError,
                });
              }
              // Depending on consumer policy: throw handlerError to trigger Kafka retry,
              // or catch and route to a Dead Letter Queue (DLQ).
              throw handlerError;
            }
          }
        }
      );
    });
  }

  /**
   * Disconnects producer and consumer instances cleanly during shutdown.
   */
  async shutdown() {
    await Promise.allSettled([
      this.producer.disconnect(),
      this.consumer.disconnect(),
    ]);
  }
}

module.exports = KafkaEventBus;