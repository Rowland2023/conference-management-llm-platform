// src/conference-management/ticket/infrastructure/mappers/TicketMapper.js

import { Ticket } from "../../domain/entities/Ticket.js";
import { Money } from "../../domain/valueObjects/Money.js";

export class TicketMapper {
  /**
   * Maps a PostgreSQL row to a domain entity.
   */
  toDomain(row) {
    if (!row) return null;

    return Ticket.rehydrate({
      id: row.id,
      conferenceId: row.conference_id,
      type: row.type,
      price: new Money(
        row.price_amount,
        row.price_currency
      ),
      capacity: row.capacity,
      reserved: row.reserved,
      sold: row.sold,
      status: row.status,
      version: row.version,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  /**
   * Maps a domain entity to a PostgreSQL row.
   */
  toPersistence(ticket) {
    return {
      id: ticket.id,
      conference_id: ticket.conferenceId,
      type: ticket.type,
      price_amount: ticket.price.amount,
      price_currency: ticket.price.currency,
      capacity: ticket.capacity,
      reserved: ticket.reserved,
      sold: ticket.sold,
      status: ticket.status,
      version: ticket.version,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt,
    };
  }
}