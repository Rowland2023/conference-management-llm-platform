// src/conference-management/accounting_services/index.js
// Composition Root for Accounting Services Bounded Context

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

// ==========================================
// 1. Shared Kernel Infrastructure & Application
// ==========================================
import { UnitOfWork } from "../../shared/application/persistence/UnitOfWork.js";
import { PostgresOutboxRepository } from "../../shared/Infrastructure/messaging/outbox/PostgresOutboxRepository.js";
import { OutboxWorker as OutboxPublisherWorker } from "../../shared/Infrastructure/messaging/outbox/outboxworker.js";

// ==========================================
// 2. Ledger Bounded Context Imports
// ==========================================
import { PostgresAccountRepository } from "./Ledger/infrastructure/repositories/postgres-account.repository.js";
import { PostgresHoldRepository } from "./Ledger/infrastructure/repositories/postgres-hold.repository.js";
import { PostgresJournalEntryRepository } from "./Ledger/infrastructure/repositories/postgres-journal-entry.repository.js";

import { PostJournalEntryUseCase } from "./Ledger/application/post-journal-entry.usecase.js";
import { GetLedgerBalanceUseCase } from "./Ledger/application/get-ledger-balance.usecase.js";
import { CreateHoldUseCase } from "./Ledger/application/create-hold.usecase.js";
import { ReverseJournalEntryUseCase } from "./Ledger/application/reverse-journal-entry.usecase.js";

import createAccountRoutes from "./Ledger/presentation/router/account.routes.js";
import createJournalRoutes from "./Ledger/presentation/router/journal.routes.js";
import createHoldRoutes from "./Ledger/presentation/router/hold.routes.js";

// ==========================================
// 3. Payment Bounded Context Imports
// ==========================================
import { PostgresPaymentRepository } from "./Payment/infrastructure/persistance/repositories/PostgresPaymentRepository.js";
import createPaymentRoutes from "./Payment/api/payment.route.js";

// ==========================================
// 4. Invoice & Refund Bounded Context Imports
// ==========================================
import { PostgresInvoiceRepository } from "./invoice/infrastructure/repositories/PostgresInvoiceRepository.js";
import createInvoiceRoutes from "./invoice/presentation/routes/invoice.routes.js";

import { RefundRepository } from "./refund/infrastructure/repositories/RefundRepository.js";

/**
 * Express Presentation Factory for Accounting Domain
 */
export function createAccountingPresentationApp(controllers, middlewares) {
  const app = express();

  app.disable('x-powered-by');

  // 1. Diagnostics & Observability
  app.use(helmet());
  app.use(
    cors({
      origin: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : '*',
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Correlation-ID',
        'X-Idempotency-Key',
      ],
    })
  );
  app.use(middlewares.requestIdMiddleware);

  // 2. Unauthenticated Health Endpoint
  app.get('/health', (req, res) =>
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() })
  );

  // 3. Webhook Ingress (RAW BODY for HMAC signature verification)
  if (controllers.webhookController && typeof createWebhookRoutes === 'function') {
    app.use(
      '/v1/webhooks',
      express.raw({ type: 'application/json' }),
      middlewares.verifyWebhookSignature,
      createWebhookRoutes(controllers.webhookController)
    );
  }

  // 4. Standard Body Parser & Syntax Error Handling
  app.use(express.json({ limit: '1mb' }));
  app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MALFORMED_JSON',
          message: 'The request payload contains invalid JSON syntax.',
          correlationId: req.correlationId,
        },
      });
    }
    next(err);
  });

  // 5. Authenticated Boundary
  app.use(middlewares.authMiddleware);

  // 6. Financial Domain Routes
  // --- Double-Entry Ledger Core ---
  app.use('/v1/accounts', createAccountRoutes(controllers.accountController));
  app.use('/v1/journal-entries', createJournalRoutes(controllers.journalController));
  app.use('/v1/holds', createHoldRoutes(controllers.holdController));

  // --- Invoicing Aggregate ---
  app.use('/v1/invoices', createInvoiceRoutes(controllers.invoiceController));

  // --- Money Movement & Refunds (Idempotency Protected) ---
  app.use('/v1/payments', middlewares.idempotencyMiddleware, createPaymentRoutes(controllers.paymentController));

  if (controllers.refundController && typeof createRefundRoutes === 'function') {
    app.use('/v1/refunds', middlewares.idempotencyMiddleware, createRefundRoutes(controllers.refundController));
  }

  // 7. Fallback & Centralized Error Handling
  app.use((req, res) =>
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        correlationId: req.correlationId,
      },
    })
  );

  app.use(middlewares.errorHandler);

  return app;
}

/**
 * Module Container Initializer for Accounting Services
 */
export function createAccountingServicesModule({ dbConnection, eventBus, logger }) {
  if (!dbConnection) throw new Error("AccountingServicesModule: 'dbConnection' is required.");
  if (!logger) throw new Error("AccountingServicesModule: 'logger' is required.");
  if (!eventBus) throw new Error("AccountingServicesModule: 'eventBus' is required.");

  // Transactional Unit of Work
  const uow = new UnitOfWork(dbConnection);

  // Instantiate Subdomain Repositories
  const accountRepository = new PostgresAccountRepository({ uow });
  const journalRepository = new PostgresJournalEntryRepository({ uow });
  const holdRepository = new PostgresHoldRepository({ uow });
  const paymentRepository = new PostgresPaymentRepository({ uow });
  const invoiceRepository = new PostgresInvoiceRepository({ uow });
  const refundRepository = new RefundRepository({ uow });
  const outboxRepository = new PostgresOutboxRepository({ uow });

  // Instantiate Application Use Cases
  const postJournalEntryUseCase = new PostJournalEntryUseCase({
    journalRepository,
    accountRepository,
    outboxRepository,
    uow,
    logger,
  });

  const reverseJournalEntryUseCase = new ReverseJournalEntryUseCase({
    journalRepository,
    accountRepository,
    outboxRepository,
    uow,
    logger,
  });

  const getLedgerBalanceUseCase = new GetLedgerBalanceUseCase({
    accountRepository,
    logger,
  });

  const createHoldUseCase = new CreateHoldUseCase({
    holdRepository,
    accountRepository,
    outboxRepository,
    uow,
    logger,
  });

  // Outbox Publisher Worker Initialization
  const outboxWorker = new OutboxPublisherWorker({
    outboxRepository,
    eventBus,
    logger,
  });

  let subscriptionToken = null;

  return {
    createPresentationApp: (controllers, middlewares) =>
      createAccountingPresentationApp(controllers, middlewares),

    subscribe: () => {
      subscriptionToken = eventBus.subscribe('payment.released', async (evt) => {
        try {
          await postJournalEntryUseCase.execute({
            transactionId: evt.payload.transactionId,
            amount: evt.payload.amount,
            correlationId: evt.correlationId,
          });
        } catch (err) {
          logger.error({ err, eventId: evt.id }, "Failed to process payment.released event in Accounting Services");
        }
      });
    },

    start: async () => {
      logger.info("Starting Accounting Services Outbox Worker...");
      await outboxWorker.start();
    },

    stop: async () => {
      logger.info("Stopping Accounting Services Outbox Worker...");
      if (subscriptionToken && typeof eventBus.unsubscribe === 'function') {
        eventBus.unsubscribe('payment.released', subscriptionToken);
      }
      await outboxWorker.stop();
    },
  };
}