// src/conference-management/ticket/index.js
// Composition Root for Ticket Module

// Infrastructure
import { TicketModelDefine } from "./Infrastructure/schemas/TicketModel.js";
import { TicketMapper } from "./Infrastructure/mappers/TicketMapper.js";
import { PostgresTicketRepository } from "./Infrastructure/repository/PostgresTicketRepository.js";
import { PostgresOutboxRepository } from "../../shared/Infrastructure/messaging/outbox/PostgresOutboxRepository.js";
import { UnitOfWork } from "../../shared/application/persistence/UnitOfWork.js";

// Application Command & Query Services
import { TicketCommandService } from "./application/commands/TicketCommandService.js";
import { PaymentCommandService } from "./application/commands/PaymentCommandService.js";

// Presentation
import { TicketController } from "./api/ticket.controller.js";
import { getTicketRoutes } from "./api/ticket.route.js";

/**
 * Composition Root for Ticket Module
 */
export function createTicketModule({
  db,
  sequelize,
  transactionManager,
  logger,
  config
}) {
  const activeDb = db || sequelize;

  // 1. Core Dependency Verification
  if (!activeDb) throw new Error("Ticket Module: 'db' or 'sequelize' connection is required.");
  
  const activeTxManager = transactionManager || new UnitOfWork(activeDb);

  // 2. Models & Infrastructure Mappers
  const TicketModel = TicketModelDefine(activeDb);
  const ticketMapper = new TicketMapper();

  // 3. Repositories (Bound to transaction manager)
  const ticketRepository = new PostgresTicketRepository({
    model: TicketModel,
    mapper: ticketMapper,
    transactionManager: activeTxManager
  });

  const outboxRepository = new PostgresOutboxRepository({
    uow: activeTxManager
  });

  // 4. Command Services
  const ticketCommandService = new TicketCommandService({
    ticketRepository,
    outboxRepository,
    transactionManager: activeTxManager,
    logger
  });

  const paymentCommandService = new PaymentCommandService({
    ticketRepository,
    outboxRepository,
    transactionManager: activeTxManager,
    logger
  });

  // 5. Presentation Router
  const ticketController = new TicketController({
    ticketCommandService,
    paymentCommandService
  });

  const router = getTicketRoutes(ticketController);

  // Track event subscriptions for teardown
  const subscriptions = new Map();

  // 6. Public Surface Boundary
  return {
    router,

    /**
     * Cross-module Integration Subscriptions
     */
    subscribe: (eventBus) => {
      if (!eventBus) {
        logger?.warn("Ticket Module: No eventBus provided. Skipping subscriptions.");
        return;
      }

      // 1. Auto-release reserved ticket on payment failure
      const failedSubToken = eventBus.subscribe("payment.failed", async (evt) => {
        const { ticketId, reason, correlationId } = evt || {};
        if (!ticketId) return;

        logger?.info(
          { ticketId, correlationId },
          "Ticket Module: Auto-releasing ticket due to payment failure."
        );

        try {
          await ticketCommandService.releaseTicket({
            ticketId,
            reason: reason || "PAYMENT_FAILED",
            correlationId
          });
        } catch (err) {
          logger?.error(
            { err, ticketId, correlationId },
            "Failed to release ticket following payment.failed event"
          );
        }
      });
      if (failedSubToken) subscriptions.set("payment.failed", failedSubToken);

      // 2. Auto-complete ticket purchase on payment success
      const succeededSubToken = eventBus.subscribe("payment.succeeded", async (evt) => {
        const { ticketId, paymentReference, correlationId } = evt || {};
        if (!ticketId) return;

        try {
          await paymentCommandService.completePurchase({
            ticketId,
            paymentReference,
            correlationId
          });
        } catch (err) {
          logger?.error(
            { err, ticketId, correlationId },
            "Failed to complete ticket purchase following payment.succeeded event"
          );
        }
      });
      if (succeededSubToken) subscriptions.set("payment.succeeded", succeededSubToken);
    },

    start: async () => {
      logger?.info("Ticket module initialized and ready.");
    },

    stop: async (eventBus) => {
      if (eventBus && typeof eventBus.unsubscribe === 'function') {
        for (const [topic, token] of subscriptions.entries()) {
          eventBus.unsubscribe(topic, token);
        }
        subscriptions.clear();
      }
      logger?.info("Ticket module cleanly stopped.");
    }
  };
}