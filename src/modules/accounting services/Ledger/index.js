/**
 * @file src/index.js
 *
 * Ledger Service Bootstrap
 *
 * Responsibilities:
 * - Load environment
 * - Build application container
 * - Start HTTP server
 * - Coordinate graceful shutdown
 *
 * Does NOT know:
 * - Database implementation
 * - Kafka implementation
 * - Repository details
 * - Business logic
 */

require('dotenv').config();

const buildContainer = require('./container');
const createPresentationApp = require('./modules/ledger/presentation');

async function bootstrap() {
  let container;
  let server;
  let isShuttingDown = false;

  const shutdown = async (signal, error) => {
    // 1. Prevent concurrent shutdown executions
    if (isShuttingDown) return;
    isShuttingDown = true;

    // Fallback console log in case container/logger didn't initialize
    const activeLogger = container?.logger || console;

    if (activeLogger.warn) {
      activeLogger.warn({ signal, error }, 'Graceful shutdown initiated');
    } else {
      console.warn(`Graceful shutdown initiated [${signal}]`, error || '');
    }

    // 2. Force hard exit after 15-second timeout safeguard
    const forceTimer = setTimeout(() => {
      if (activeLogger.error) {
        activeLogger.error('Graceful shutdown timeout exceeded. Forcefully exiting.');
      }
      process.exit(1);
    }, 15000);

    // Unref timer so it doesn't hold the event loop open if everything closes smoothly
    if (forceTimer.unref) forceTimer.unref();

    try {
      // 3. Stop accepting new HTTP traffic
      if (server) {
        await new Promise((resolve) => {
          server.close(resolve);
        });
      }

      // 4. Teardown infra resources (DB pool, Kafka, Redis, Outbox relay)
      if (container?.shutdown) {
        await container.shutdown();
      }

      clearTimeout(forceTimer);

      if (activeLogger.info) {
        activeLogger.info('Ledger service shutdown completed cleanly');
      }

      // Explicit exit to prevent lingering handle hangs
      process.exit(error ? 1 : 0);
    } catch (shutdownError) {
      clearTimeout(forceTimer);

      if (activeLogger.error) {
        activeLogger.error({ shutdownError }, 'Graceful shutdown failed');
      } else {
        console.error('Graceful shutdown failed', shutdownError);
      }

      process.exit(1);
    }
  };

  try {
    /**
     * 1. Build Dependency Graph
     */
    container = await buildContainer();
    const { logger } = container;

    logger.info(
      { service: 'ledger', environment: process.env.NODE_ENV },
      'Ledger container initialized'
    );

    /**
     * 2. Verify Infrastructure & Warm Pools
     */
    await container.startup();

    /**
     * 3. Create HTTP Application
     */
    const app = createPresentationApp({
      accountController: container.accountController,
      journalController: container.journalController,
      holdController: container.holdController,
      logger,
    });

    /**
     * 4. Start HTTP Server
     */
    const port = Number(process.env.PORT || 3000);

    server = app.listen(port, () => {
      logger.info(
        { port, environment: process.env.NODE_ENV },
        'Ledger HTTP server started'
      );
    });

    server.on('error', (error) => {
      logger.error({ error }, 'HTTP server runtime failure');
      shutdown('server_error', error);
    });

    /**
     * 5. Process Lifecycle Traps
     */
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('uncaughtException', (error) => shutdown('uncaughtException', error));
    process.on('unhandledRejection', (reason) => shutdown('unhandledRejection', reason));

  } catch (error) {
    console.error('Fatal bootstrap failure:', error);

    if (container?.shutdown) {
      await container.shutdown().catch(() => {});
    }

    process.exit(1);
  }
}

bootstrap();