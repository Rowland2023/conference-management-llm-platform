/**
 * @file src/Shared/infrastructure/messaging/serialization/event.serializer.js
 * @description Transforms domain events into standardized wire formats with full tracing metadata.
 */
const crypto = require('crypto');
const RequestContext = require('../../../cross-cutting/request-context');

class EventSerializer {
  /**
   * Safely formats date input to ISO 8601 string with fallback to current timestamp.
   * @private
   */
  static _toValidISOString(dateVal) {
    if (!dateVal) return new Date().toISOString();
    try {
      const parsed = new Date(dateVal);
      return isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
    } catch {
      return new Date().toISOString();
    }
  }

  /**
   * Serializes a domain event object or aggregate into a standardized message wire envelope.
   *
   * @param {Object} params
   * @param {Object} params.event - Domain Event instance or payload object
   * @param {string} [params.event.id] - Event unique identifier (UUID)
   * @param {string} [params.event.eventType] - Event topic/type name (e.g. 'ledger.journal_entry.posted')
   * @param {string} [params.event.aggregateType] - Domain aggregate boundary name (e.g. 'JournalEntry')
   * @param {string|number} [params.event.aggregateId] - Aggregate root identifier
   * @param {Object} [params.event.payload] - Main domain state
   * @param {Date|string} [params.event.occurredOn] - Event timestamp
   * @param {Object} [params.customHeaders={}] - Additional headers
   * @returns {Object} Wire-ready event envelope
   */
  static serialize({ event, customHeaders = {} }) {
    if (!event || typeof event !== 'object') {
      throw new Error('[EventSerializer] Cannot serialize null, undefined, or non-object event.');
    }

    const eventType = event.eventType || event.constructor?.name;
    if (!eventType || eventType === 'Object') {
      throw new Error('[EventSerializer] Event must specify a valid eventType or class name.');
    }

    // Capture context automatically from execution context
    const currentContext = RequestContext.getAll() || {};

    const headers = {
      'x-correlation-id': currentContext.correlationId || customHeaders['x-correlation-id'] || null,
      'x-tenant-id': currentContext.tenantId || customHeaders['x-tenant-id'] || null,
      'x-user-id': currentContext.userId || customHeaders['x-user-id'] || null,
      'x-serialized-at': new Date().toISOString(),
      ...customHeaders,
    };

    // Safely extract domain data payload without duplicating envelope fields
    let dataPayload;
    if (typeof event.toPrimitives === 'function') {
      dataPayload = event.toPrimitives();
    } else if (event.payload !== undefined) {
      dataPayload = event.payload;
    } else {
      // Shallow shallow-clone event and strip out top-level envelope metadata fields
      const { id, eventId, eventType: _et, aggregateType: _at, aggregateId: _ai, occurredOn: _oo, headers: _hd, ...rest } = event;
      dataPayload = rest;
    }

    return {
      eventId: event.id || event.eventId || crypto.randomUUID(),
      eventType,
      aggregateType: event.aggregateType || 'UNKNOWN',
      aggregateId: event.aggregateId !== undefined && event.aggregateId !== null ? String(event.aggregateId) : null,
      occurredOn: EventSerializer._toValidISOString(event.occurredOn),
      headers,
      payload: dataPayload ?? {},
    };
  }

  /**
   * Stringifies the serialized event envelope to a JSON string for Kafka transport or Outbox storage.
   *
   * @param {Object} options - Options passed to serialize()
   * @returns {string} JSON string
   */
  static serializeToJSON(options) {
    const envelope = EventSerializer.serialize(options);
    return JSON.stringify(envelope);
  }
}

module.exports = EventSerializer;