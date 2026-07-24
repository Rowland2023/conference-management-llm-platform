/**
 * @file src/Shared/infrastructure/outbox/OutboxSerializer.js
 * @description Transforms Domain Event entities into persisted Outbox database records
 *              and deserializes them back for Outbox Relay dispatching.
 */
const { randomUUID } = require('node:crypto');
const RequestContext = require('../../../cross-cutting/request-context');

class OutboxSerializer {
  /**
   * Serializes a Domain Event into a flat database payload ready for SQL insertion.
   *
   * @param {Object} params
   * @param {Object} params.event - The Domain Event object/instance
   * @param {Object} [params.customHeaders] - Additional contextual headers
   * @param {boolean} [params.stringifyJson=false] - Set to true if DB columns are TEXT/VARCHAR instead of JSONB
   * @returns {Object} Plain object structured for SQL outbox table insertion
   */
  static serialize({ event, customHeaders = {}, stringifyJson = false }) {
    if (!event) {
      throw new Error('[OutboxSerializer] Cannot serialize undefined or null event.');
    }

    const eventType = event.eventType || event.constructor?.name;
    if (!eventType || eventType === 'Object') {
      throw new Error('[OutboxSerializer] Event must provide an explicit eventType or named constructor.');
    }

    // Capture context automatically from execution thread
    const currentContext = RequestContext.getAll() || {};

    // Build headers with strict fallback order
    const mergedHeaders = {
      'x-correlation-id': currentContext.correlationId || customHeaders['x-correlation-id'] || null,
      'x-tenant-id': currentContext.tenantId || customHeaders['x-tenant-id'] || null,
      'x-user-id': currentContext.userId || customHeaders['x-user-id'] || null,
    };

    // Safely append non-conflicting custom headers
    for (const [key, value] of Object.entries(customHeaders)) {
      if (value !== undefined) {
        mergedHeaders[key] = value;
      }
    }

    // Extract primitive payload from domain event entity
    const rawPayload = typeof event.toPrimitives === 'function' 
      ? event.toPrimitives() 
      : (event.payload || event);

    const finalPayload = stringifyJson && typeof rawPayload !== 'string'
      ? JSON.stringify(rawPayload)
      : rawPayload;

    const finalHeaders = stringifyJson
      ? JSON.stringify(mergedHeaders)
      : mergedHeaders;

    const aggregateId = event.aggregateId || event.id || null;

    return {
      id: event.id || event.eventId || randomUUID(),
      aggregate_type: event.aggregateType || 'UNKNOWN',
      aggregate_id: aggregateId ? String(aggregateId) : null,
      event_type: eventType,
      payload: finalPayload,
      headers: finalHeaders,
      status: 'PENDING',
      retry_count: 0,
      occurred_on: event.occurredOn 
        ? new Date(event.occurredOn).toISOString() 
        : new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Deserializes a database record back into a formatted envelope ready for Kafka dispatching.
   *
   * @param {Object} record - Raw database row from outbox table
   * @returns {Object} Standardized message envelope for KafkaProducer / KafkaEventBus
   */
  static deserialize(record) {
    if (!record) {
      throw new Error('[OutboxSerializer] Cannot deserialize empty record.');
    }

    let parsedPayload = record.payload;
    if (typeof record.payload === 'string') {
      try {
        parsedPayload = JSON.parse(record.payload);
      } catch (err) {
        parsedPayload = record.payload;
      }
    }

    let parsedHeaders = {};
    if (typeof record.headers === 'string') {
      try {
        parsedHeaders = JSON.parse(record.headers);
      } catch (err) {
        parsedHeaders = {};
      }
    } else if (record.headers && typeof record.headers === 'object') {
      parsedHeaders = record.headers;
    }

    const occurredOn = record.occurred_on instanceof Date 
      ? record.occurred_on.toISOString() 
      : (record.occurred_on || new Date().toISOString());

    return {
      id: record.id,
      topic: record.event_type,
      aggregateId: record.aggregate_id,
      aggregateType: record.aggregate_type,
      headers: parsedHeaders,
      payload: {
        eventId: record.id,
        eventType: record.event_type,
        aggregateId: record.aggregate_id,
        occurredOn,
        data: parsedPayload,
      },
    };
  }
}

module.exports = OutboxSerializer;