// src/conference-management/ticket/domain/events/TicketPurchased.js

import { DomainEvent } from "../../../../shared/domain/DomainEvent.js";

export class TicketPurchased extends DomainEvent {
  static EVENT_NAME = "ticket.purchased";

  constructor({
    ticketId,
    conferenceId,
    quantity,
    paymentReference,
    correlationId = null,
    causationId = null,
    occurredAt,
    eventVersion = 1
  }) {
    super({
      eventName: TicketPurchased.EVENT_NAME,
      aggregateId: ticketId,
      eventVersion,
      occurredAt,
      correlationId,
      causationId
    });

    this.payload = Object.freeze({
      ticketId,
      conferenceId,
      quantity,
      paymentReference
    });

    this.freezeEvent();
  }
}