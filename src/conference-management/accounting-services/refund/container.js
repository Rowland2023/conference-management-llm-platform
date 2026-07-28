/**
 * @file src/modules/refund/container.js
 * @description Dependency Injection Composition Root for the Refund Context.
 */

// Shared Infrastructure Adapters
import { OutboxRepository } from "../../shared/infrastructure/index.js";

// Domain & Application Use Cases
import ProcessRefundUseCase from "./application/ProcessRefundUseCase.js";
import RefundService from "./application/RefundService.js";

// Infrastructure Adapters & Repositories
import RefundRepository from "./infrastructure/repositories/RefundRepository.js";

import {
  PaystackGatewayAdapter,
} from "./infrastructure/adapters/PaymentGatewayAdapter.js";

// Presentation / HTTP Layer
import RefundController from "./presentation/http/RefundController.js";



/**
 * Bootstraps and wires all dependencies for the Refund Context.
 *
 * @param {Object} params
 * @param {import('knex').Knex} params.knex
 * @param {Object} params.httpClient
 * @param {Object} params.dbTransactionManager
 * @param {Object} [params.logger]
 *
 * @returns {{
 *   refundController: RefundController,
 *   refundService: RefundService,
 *   processRefundUseCase: ProcessRefundUseCase,
 *   refundRepository: RefundRepository
 * }}
 */
function createRefundModule({
  knex,
  httpClient,
  dbTransactionManager,
  logger = console,
}) {


  // ---------------------------------------------------------------------------
  // 1. Validate Infrastructure Configuration
  // ---------------------------------------------------------------------------

  const paystackSecretKey =
    process.env.PAYSTACK_SECRET_KEY;


  if (!paystackSecretKey) {

    throw new Error(
      "[RefundModuleContainer] Initialization failed: PAYSTACK_SECRET_KEY environment variable is required."
    );

  }




  // ---------------------------------------------------------------------------
  // 2. Instantiate Infrastructure Layer
  // ---------------------------------------------------------------------------

  const outboxRepository =
    new OutboxRepository({
      knex,
    });



  const refundRepository =
    new RefundRepository({
      knex,
    });



  const paymentGatewayAdapter =
    new PaystackGatewayAdapter({

      httpClient,

      secretKey:
        paystackSecretKey,

    });





  // ---------------------------------------------------------------------------
  // 3. Instantiate Application Use Cases
  // ---------------------------------------------------------------------------

  const processRefundUseCase =
    new ProcessRefundUseCase({

      refundRepository,

      paymentGatewayAdapter,

      outboxRepository,

      dbTransactionManager,

      logger,

    });





  // ---------------------------------------------------------------------------
  // 4. Instantiate Application Service
  // ---------------------------------------------------------------------------

  const refundService =
    new RefundService({

      refundRepository,

      paymentGatewayAdapter,

      outboxRepository,

      processRefundUseCase,

      dbTransactionManager,

      logger,

    });





  // ---------------------------------------------------------------------------
  // 5. Instantiate Presentation Layer
  // ---------------------------------------------------------------------------

  const refundController =
    new RefundController({

      refundService,

    });





  // ---------------------------------------------------------------------------
  // Composition Root Output
  // ---------------------------------------------------------------------------

  return {

    refundController,

    refundService,

    processRefundUseCase,

    refundRepository,

    outboxRepository,

  };

}



export default createRefundModule;