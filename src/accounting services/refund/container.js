/**
 * @file src/modules/refund/container.js
 * @description Dependency Injection Composition Root for the Refund Context.
 */

// Shared Infrastructure Adapters
const { OutboxRepository } = require('../../shared/infrastructure');

// Domain & Application Use Cases
const ProcessRefundUseCase = require('./application/ProcessRefundUseCase');
const RefundService = require('./application/RefundService');

// Infrastructure Adapters & Repositories
const RefundRepository = require('./infrastructure/repositories/RefundRepository');
const { PaystackGatewayAdapter } = require('./infrastructure/adapters/PaymentGatewayAdapter');

// Presentation / HTTP Layer
const RefundController = require('./presentation/http/RefundController');

/**
 * Bootstraps and wires all dependencies for the Refund Context.
 *
 * @param {Object} params
 * @param {import('knex').Knex} params.knex - Database connection instance
 * @param {Object} params.httpClient - Configured HTTP client (Axios/Fetch)
 * @param {Object} params.dbTransactionManager - Isolation manager for DB transactions
 * @param {Object} [params.logger] - Structured logger (Winston/Pino)
 * @returns {{
 *   refundController: RefundController,
 *   refundService: RefundService,
 *   processRefundUseCase: ProcessRefundUseCase,
 *   refundRepository: RefundRepository
 * }}
 */
function createRefundModule({ knex, httpClient, dbTransactionManager, logger = console }) {
  // 1. Guard Critical Infrastructure Configuration
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!paystackSecretKey) {
    throw new Error('[RefundModuleContainer] Initialization failed: PAYSTACK_SECRET_KEY environment variable is required.');
  }

  // 2. Instantiate Infrastructure Repositories & Adapters
  const outboxRepository = new OutboxRepository({ knex });
  const refundRepository = new RefundRepository({ knex });

  const paymentGatewayAdapter = new PaystackGatewayAdapter({
    httpClient,
    secretKey: paystackSecretKey,
  });

  // 3. Instantiate Application Use Cases
  const processRefundUseCase = new ProcessRefundUseCase({
    refundRepository,
    paymentGatewayAdapter,
    outboxRepository,
    dbTransactionManager,
    logger,
  });

  // 4. Instantiate Application Service Orchestrator
  const refundService = new RefundService({
    refundRepository,
    paymentGatewayAdapter,
    outboxRepository,
    processRefundUseCase,
    dbTransactionManager,
    logger,
  });

  // 5. Instantiate HTTP Controller with Method Autobinding
  const refundController = new RefundController({
    refundService,
  });

  // Return composition root dependencies for Express routes & background workers
  return {
    refundController,
    refundService,
    processRefundUseCase,
    refundRepository,
    outboxRepository,
  };
}

module.exports = createRefundModule;