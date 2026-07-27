// src/conference-management/ticket/domain/events/TicketCreated.js

import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";

export class TicketCreated extends DomainEvent {
  static EVENT_NAME = "ticket.created";

  /**
   * @param {Object} params
   * @param {string} params.ticketId
   * @param {string} params.conferenceId
   * @param {string} params.type
   * @param {number} params.capacity
   * @param {Object} params.price
   * @param {string|null} [params.correlationId]
   * @param {string|null} [params.causationId]
   * @param {Date} [params.occurredAt]
   * @param {number} [params.eventVersion=1]
   */
  constructor({
    ticketId,
    conferenceId,
    type,
    capacity,
    price,
    correlationId = null,
    causationId = null,
    occurredAt,
    eventVersion = 1
  }) {
    super({
      eventName: TicketCreated.EVENT_NAME,
      aggregateId: ticketId,
      correlationId,
      causationId,
      occurredAt,
      eventVersion
    });

    this.payload = Object.freeze({
      ticketId,
      conferenceId,
      type,
      capacity,
      price
    });

    this.freezeEvent();
  }
}