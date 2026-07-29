// src/conference-management/ticket/index.js

// Infrastructure
import { TicketMapper } from "./infrastructure/mappers/TicketMapper.js";
import { PostgresTicketRepository } from "./infrastructure/repository/PostgresTicketRepository.js";
import { PostgresOutboxRepository } from "../../shared/infrastructure/messaging/outbox/PostgresOutboxRepository.js";
import { UnitOfWork } from "../../shared/application/persistence/UnitOfWork.js";

// Application
import { TicketCommandService } from "./application/commands/TicketCommandService.js";

// Presentation
import { TicketController } from "./api/ticket.controller.js";
import { createTicketRouter } from "./api/ticket.route.js";

export function createTicketModule({
  db,
  transactionManager,
  logger,
}) {
  if (!db) {
    throw new Error(
      "TicketModule requires a database connection."
    );
  }

  const unitOfWork =
    transactionManager ?? new UnitOfWork(db);

  /* -------------------------------------------------------------------------- */
  /* Infrastructure                                                              */
  /* -------------------------------------------------------------------------- */

  const ticketMapper = new TicketMapper();

  const ticketRepository = new PostgresTicketRepository({
  knex: db,
  mapper: ticketMapper,
  unitOfWork: unitOfWork,
});

  const outboxRepository =
    new PostgresOutboxRepository({
      knex: db,
    });

  /* -------------------------------------------------------------------------- */
  /* Application                                                                  */
  /* -------------------------------------------------------------------------- */

  const ticketCommandService =
    new TicketCommandService({
      ticketRepository,
      outboxRepository,
      unitOfWork,
      logger,
    });

  /* -------------------------------------------------------------------------- */
  /* Presentation                                                                 */
  /* -------------------------------------------------------------------------- */

  const ticketController =
    new TicketController({
      ticketCommandService,
    });

  const router =
    createTicketRouter(ticketController);

  const subscriptions = [];

  return {
    router,

    subscribe(eventBus) {
      if (!eventBus) {
        logger?.warn("No EventBus supplied.");
        return;
      }

      subscriptions.push(
        eventBus.subscribe(
          "payment.failed",
          async ({
            ticketId,
            reason,
            correlationId,
          }) => {
            if (!ticketId) return;

            try {
              await ticketCommandService.releaseTicket({
                ticketId,
                reason:
                  reason ?? "PAYMENT_FAILED",
                correlationId,
              });

              logger?.info(
                {
                  ticketId,
                  correlationId,
                },
                "Released reserved ticket."
              );
            } catch (err) {
              logger?.error(
                {
                  err,
                  ticketId,
                  correlationId,
                },
                "Unable to release reserved ticket."
              );
            }
          }
        )
      );

      subscriptions.push(
        eventBus.subscribe(
          "payment.succeeded",
          async ({
            ticketId,
            paymentReference,
            correlationId,
          }) => {
            if (!ticketId) return;

            try {
              await ticketCommandService.confirmPurchase({
                ticketId,
                paymentReference,
                correlationId,
              });

              logger?.info(
                {
                  ticketId,
                  correlationId,
                },
                "Ticket purchase confirmed."
              );
            } catch (err) {
              logger?.error(
                {
                  err,
                  ticketId,
                  correlationId,
                },
                "Unable to confirm ticket purchase."
              );
            }
          }
        )
      );
    },

    async start() {
      logger?.info("Ticket module started.");
    },

    async stop(eventBus) {
      if (eventBus?.unsubscribe) {
        for (const token of subscriptions) {
          eventBus.unsubscribe(token);
        }
      }

      logger?.info("Ticket module stopped.");
    },
  };
}