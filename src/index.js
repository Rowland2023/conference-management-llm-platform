
import 'dotenv/config';
import { createApp } from './app.js';
import {
  verifyDatabaseConnection,
  closeDatabaseConnection,
} from './cross-cutting/database/knex.js'; // Fixed: hyphenated path matching disk

const PORT = process.env.PORT || 3000;
const SHUTDOWN_TIMEOUT_MS = 10_000;

let server = null;
let appInstance = null;
let isShuttingDown = false;

/**
 * Gracefully shuts down the application.
 */
async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`\n${signal} received. Starting graceful shutdown...`);

  const forceExitTimeout = setTimeout(() => {
    console.error(
      `❌ Shutdown timed out (${SHUTDOWN_TIMEOUT_MS}ms). Forcing exit.`
    );
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);

  try {
    // 1. Stop accepting new HTTP requests
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
      console.log('✅ HTTP server stopped.');
    }

    // 2. Stop background workers, outbox publishers & event bus consumers
    if (appInstance?.stop) {
      await appInstance.stop();
      console.log('✅ Background workers stopped.');
    }

    // 3. Close database connection pool
    await closeDatabaseConnection();
    console.log('✅ Database connection pool closed.');

    clearTimeout(forceExitTimeout);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    clearTimeout(forceExitTimeout);
    
    process.exit(1);
  }

/* -------------------------------------------------------------------------- */
/* Infrastructure                                                               */
/* -------------------------------------------------------------------------- */

async function verifyInfrastructure() {
  await verifyDatabaseConnection();

  logger.info("📡 Database connected successfully.");
}

/* -------------------------------------------------------------------------- */
/* HTTP Server                                                                  */
/* -------------------------------------------------------------------------- */

function startHttpServer(app) {
  return new Promise((resolve, reject) => {
    const httpServer = app.listen(PORT);

    httpServer.once("listening", () => {
      resolve(httpServer);
    });

    httpServer.once("error", reject);
  });
}

function stopHttpServer() {
  if (!server) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    server.close(error => {
      if (error) {
        return reject(error);
      }

      logger.info("✅ HTTP server stopped.");

      resolve();

/**
 * Process lifecycle handlers
 */
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
  shutdown('unhandledRejection');
});

/**
 * Application bootstrap.
 */
async function start() {
  try {
    // Verify database connection before building composition root
    await verifyDatabaseConnection();
    console.log('📡 Database connected successfully.');

    // Build composition root & wire dependencies
    appInstance = await createApp({
      logger: console,
    });

    // Start background services & outbox daemons
    if (appInstance.start) {
      await appInstance.start();
    }

    // Start HTTP server
    server = appInstance.app.listen(PORT, () => {
      console.log(
        `🚀 Conference Management API running on http://localhost:${PORT}`
      );
    });
  });
}

/* -------------------------------------------------------------------------- */
/* Graceful Shutdown                                                            */
/* -------------------------------------------------------------------------- */

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  logger.info(`\n${signal} received. Starting graceful shutdown...`);

  const timeout = setTimeout(() => {
    logger.error(
      `❌ Shutdown exceeded ${SHUTDOWN_TIMEOUT}ms. Forcing exit.`
    );

    process.exit(1);
  }, SHUTDOWN_TIMEOUT);

  try {
    await stopHttpServer();

    if (application?.stop) {
      await application.stop();

      logger.info("✅ Application stopped.");
    }

    await closeDatabaseConnection();

    logger.info("✅ Database connection closed.");

    clearTimeout(timeout);

    process.exit(0);
  } catch (error) {
    clearTimeout(timeout);

    logger.error("❌ Shutdown failed.");
    logger.error(error);

    process.exit(1);
  }
}

/* -------------------------------------------------------------------------- */
/* Process Events                                                               */
/* -------------------------------------------------------------------------- */

process.once("SIGINT", () => shutdown("SIGINT"));

process.once("SIGTERM", () => shutdown("SIGTERM"));

process.once("uncaughtException", error => {
  logger.error("❌ Uncaught Exception");
  logger.error(error);

  shutdown("uncaughtException");
});

process.once("unhandledRejection", reason => {
  logger.error("❌ Unhandled Rejection");
  logger.error(reason);

  shutdown("unhandledRejection");
});

/* -------------------------------------------------------------------------- */
/* Start Application                                                            */
/* -------------------------------------------------------------------------- */

bootstrap();