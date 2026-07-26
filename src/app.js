// src/app.js

import express from "express";
import { db } from "./cross-cutting/database/knex.js"; 

// Global Shared Infrastructure Engine Components
import { KafkaEventBus } from "./shared/Infrastructure/messaging/kafka/KafkaEventBus.js";
import { OutboxWorker } from "./shared/Infrastructure/messaging/outbox/outboxworker.js";
import { initLLM } from "./shared/Infrastructure/ai/index.js";

// Feature Modules
import { createConferenceEventScheduleSubModule } from "./conference-management/event_schedule/index.js";
import { createAccountingServicesModule } from "./conference-management/accounting_services/index.js";
import { createConferenceRegistrationSubModule } from "./conference-management/registration/index.js";
import { createTicketModule } from "./conference-management/ticket/index.js";

// Security & API Transports
import { LLMController } from "./shared/Infrastructure/ai/api/llm.controller.js";
import { createLLMRouter } from "./shared/Infrastructure/ai/api/llm.route.js";
import { AuthService } from "./shared-security-starter/application/AuthService.js";
import { authenticate } from "./shared-security-starter/presentation/authenticate.js";

export async function createApp({ logger = console } = {}) {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  const authService = new AuthService();

  // =============================================================================
  // 1. INITIALIZE GLOBAL INFRASTRUCTURE CORES
  // =============================================================================
  const messageClient = new KafkaEventBus();

  const outboxPublisher = new OutboxWorker({
    db,
    messageClient,
  });

  // =============================================================================
  // 2. INITIALIZE FEATURE MODULES (Injecting Shared Connections)
  // =============================================================================
  const eventModule = createConferenceEventScheduleSubModule({
    dbConnection: db,
    eventBus: messageClient,
    logger,
  });

  const accountingModule = createAccountingServicesModule({
    dbConnection: db,
    eventBus: messageClient,
    logger,
  });

  const registrationModule = createConferenceRegistrationSubModule({
    db,
    logger,
  });

  const ticketModule = createTicketModule({
    sequelize: db,
    transactionManager: db,
    logger,
  });

  const modules = [eventModule, accountingModule, registrationModule, ticketModule];

  // =============================================================================
  // 3. EVENT BUS SUBSCRIPTIONS
  // =============================================================================
  for (const targetModule of modules) {
    if (typeof targetModule.subscribe === "function") {
      targetModule.subscribe(messageClient);
    }
  }

  // =============================================================================
  // 4. COGNITIVE ASSISTANT CORE (LLM Tool Mapping)
  // =============================================================================
  const llm = initLLM({
    openAIConfig: { apiKey: process.env.OPENAI_API_KEY },
    uowFactory: db.unitOfWorkFactory,
    useCases: {
      ...eventModule.useCases,
      ...accountingModule.useCases,
      ...registrationModule.useCases,
      ...ticketModule.useCases,
    },
  });

  const llmController = new LLMController({
    commandInterceptor: llm.commandInterceptor,
    authService,
  });
  const llmRouter = createLLMRouter({
    llmController,
    authenticate,
  });

  // =============================================================================
  // 5. ROUTE NETWORK MOUNT POINTS
  // =============================================================================
  if (eventModule.eventRouter) app.use("/api/events", eventModule.eventRouter);
  if (registrationModule.router) app.use("/api/registrations", registrationModule.router);
  if (ticketModule.router) app.use("/api/tickets", ticketModule.router);
  app.use("/api/ai", llmRouter);

  // Mount presentation app for Accounting
  const accountingApp = accountingModule.createPresentationApp(
    {},
    {
      requestIdMiddleware: (req, res, next) => next(),
      verifyWebhookSignature: (req, res, next) => next(),
      authMiddleware: authenticate,
      idempotencyMiddleware: (req, res, next) => next(),
      errorHandler: (err, req, res, next) => next(err),
    }
  );
  app.use("/api/accounting", accountingApp);

  app.get("/health", (req, res) =>
    res.json({ status: "UP", service: "conference-core", timestamp: new Date().toISOString() })
  );

  // Fallback Error Boundaries
  app.use((req, res) =>
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: `Route ${req.method} ${req.originalUrl} not found.` },
    })
  );

  app.use((err, req, res, next) => {
    logger.error("Unhandled Inbound Error:", err);
    res.status(err.statusCode || 500).json({
      success: false,
      error: {
        code: err.code || "INTERNAL_SERVER_ERROR",
        message: err.message || "An unexpected error occurred.",
      },
    });
  });

  // =============================================================================
  // 6. DAEMON LIFECYCLE MANAGEMENT
  // =============================================================================
  const start = async () => {
    logger.info("Connecting global messaging backbone pools...");
    if (messageClient && typeof messageClient.connect === "function") {
      await messageClient.connect();
    }

    logger.info("Starting transactional outbox sync engines...");
    if (outboxPublisher && typeof outboxPublisher.start === "function") {
      await outboxPublisher.start();
    }

    logger.info("Initializing module daemons & workers...");
    for (const targetModule of modules) {
      if (typeof targetModule.start === "function") {
        await targetModule.start();
      }
    }
    logger.info("Application boot sequence fully synchronized.");
  };

  const stop = async () => {
    logger.info("Initiating graceful module drain process...");

    for (const targetModule of modules) {
      if (typeof targetModule.stop === "function") {
        try {
          await targetModule.stop(messageClient);
        } catch (e) {
          logger.error("Error stopping module daemon:", e);
        }
      }
    }

    if (outboxPublisher && typeof outboxPublisher.stop === "function") {
      try {
        await outboxPublisher.stop();
        logger.info("Outbox publisher stopped.");
      } catch (e) {
        logger.error("Error stopping outbox publisher:", e);
      }
    }

    if (messageClient && typeof messageClient.disconnect === "function") {
      try {
        await messageClient.disconnect();
        logger.info("Message broker client disconnected.");
      } catch (e) {
        logger.error("Error disconnecting message broker:", e);
      }
    }
  };

  return { app, start, stop };
}